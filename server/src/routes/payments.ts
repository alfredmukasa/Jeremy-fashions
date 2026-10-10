import { Router } from 'express'
import Stripe from 'stripe'

import { createUserSupabase, requireSupabaseAdmin } from '../lib/supabase.js'
import { stripe } from '../lib/stripe.js'
import type { AuthedRequest } from '../middleware/auth.js'
import { optionalUser } from '../middleware/auth.js'
import { validateCreatePaymentIntent } from '../middleware/validateCheckout.js'
import { CHECKOUT_SESSION_PRICING, canReusePaymentIntent, stripeLineDescription, toMinorUnits } from '../domain/checkoutPricing.js'
import {
  attachPaymentIntent,
  CheckoutError,
  clearOrderPaymentIntent,
  createPendingOrder,
  findOrderByIdempotencyKey,
  refreshPendingOrder,
  validateCheckoutItems,
} from '../services/orderService.js'
import type { CreatePaymentIntentBody } from '../types.js'

export const paymentsRouter = Router()

const REUSABLE_PI_STATUSES = new Set(['requires_payment_method', 'requires_confirmation', 'requires_action'])

function paymentErrorMessage(error: unknown): string {
  if (error instanceof Stripe.errors.StripeError) {
    if (error.type === 'StripeAuthenticationError') {
      return 'Payment service is not configured correctly. Check Stripe keys on the server.'
    }

    return 'Payment provider rejected the request.'
  }

  if (error instanceof Error && error.message.trim()) {
    if (/SERVICE_ROLE|SECRET_KEY|STRIPE_|SUPABASE_|webhook secret/i.test(error.message)) {
      return 'Checkout is temporarily unavailable. Please try again or sign in.'
    }
    return error.message
  }

  return 'Unable to start payment. Please try again.'
}

paymentsRouter.post(
  '/create-payment-intent',
  optionalUser,
  validateCreatePaymentIntent,
  async (req, res) => {
    try {
      const user = (req as AuthedRequest).user
      const body = req.body as CreatePaymentIntentBody

      let db: ReturnType<typeof createUserSupabase>
      if (user) {
        const accountEmail = user.email.trim().toLowerCase()
        if (body.email !== accountEmail) {
          return res.status(400).json({ error: 'Checkout email must match your signed-in account.' })
        }

        const accessToken = (req as AuthedRequest).accessToken
        if (!accessToken) {
          return res.status(401).json({ error: 'Authentication is required to checkout.' })
        }

        db = createUserSupabase(accessToken)
      } else {
        // Guest checkout: no user session, so RLS can't scope an anon client to this
        // order. The service role bypasses RLS — every field it writes is still
        // validated above (email/address) and in validateCheckoutItems (items/prices).
        db = requireSupabaseAdmin()
      }

      const { items, totals, discount } = await validateCheckoutItems(body.items, {
        email: body.email,
        discountCode: body.discountCode,
      })
      const amountInCents = toMinorUnits(totals.total)
      if (amountInCents < 50) {
        throw new CheckoutError('Order total must be at least $0.50 before payment can start.', 400)
      }

      const existing = await findOrderByIdempotencyKey(db, body.idempotencyKey)
      if (existing?.payment_status === 'paid' || existing?.payment_status === 'refunded') {
        return res.status(409).json({ error: 'This checkout has already been paid.' })
      }

      if (existing) {
        await refreshPendingOrder(db, existing.id, {
          items,
          totals,
          shippingAddress: body.shippingAddress,
          billingAddress: body.billingAddress,
          billingSameAsShipping: body.billingSameAsShipping,
          discount,
        })
      }

      const existingNumber =
        existing && 'order_number' in existing && typeof existing.order_number === 'string'
          ? existing.order_number
          : null

      if (existing?.stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id)
          if (
            paymentIntent.client_secret &&
            canReusePaymentIntent({
              status: paymentIntent.status,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              expectedMinor: amountInCents,
              expectedCurrency: totals.currency,
              reusableStatuses: REUSABLE_PI_STATUSES,
            })
          ) {
            return res.json({
              orderId: existing.id,
              orderNumber: existingNumber,
              clientSecret: paymentIntent.client_secret,
              paymentIntentId: paymentIntent.id,
              totals,
              discount: discount ? { code: discount.code, amount: discount.amount } : null,
              reused: true,
            })
          }

          if (paymentIntent.status === 'succeeded') {
            return res.status(409).json({ error: 'This checkout has already been paid.' })
          }

          if (['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'].includes(paymentIntent.status)) {
            try {
              await stripe.paymentIntents.cancel(paymentIntent.id)
            } catch (cancelError) {
              console.warn('[payments] unable to cancel stale payment intent', cancelError)
            }
          }
          await clearOrderPaymentIntent(db, existing.id)
        } catch (retrieveError) {
          console.warn('[payments] stale payment intent; creating a new one', {
            orderId: existing.id,
            paymentIntentId: existing.stripe_payment_intent_id,
            error: retrieveError,
          })
          await clearOrderPaymentIntent(db, existing.id)
        }
      }

      const order =
        existing ??
        (await createPendingOrder(db, {
          userId: user?.id ?? null,
          email: body.email,
          idempotencyKey: body.idempotencyKey,
          items,
          totals,
          shippingAddress: body.shippingAddress,
          billingAddress: body.billingAddress,
          billingSameAsShipping: body.billingSameAsShipping,
          discount,
        }))

      const orderNumber =
        order && 'order_number' in order && typeof order.order_number === 'string' ? order.order_number : null

      const lineSummary = items
        .map((item) => `${item.title}|${item.size}|${item.quantity}|${toMinorUnits(item.unitPrice)}`)
        .join(';')
        .slice(0, 500)

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: totals.currency.toLowerCase(),
          // One charge in CAD. Checkout adaptive pricing stays off; this PaymentIntent is the charge.
          automatic_payment_methods: { enabled: true },
          receipt_email: body.email,
          description: stripeLineDescription(items) || `KREWNOX ${orderNumber ?? order.id}`,
          metadata: {
            order_id: order.id,
            order_number: orderNumber ?? '',
            user_id: user?.id ?? 'guest',
            idempotency_key: body.idempotencyKey,
            currency: totals.currency.toLowerCase(),
            amount_minor: String(amountInCents),
            discount_minor: String(toMinorUnits(totals.discount)),
            items: lineSummary,
            adaptive_pricing: CHECKOUT_SESSION_PRICING.adaptive_pricing.enabled ? 'enabled' : 'disabled',
          },
        },
        {
          idempotencyKey: `${body.idempotencyKey}:${amountInCents}`,
        },
      )

      if (!paymentIntent.client_secret) {
        throw new CheckoutError('Stripe did not return a client secret.', 500)
      }

      await attachPaymentIntent(db, order.id, paymentIntent.id)

      return res.json({
        orderId: order.id,
        orderNumber,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        totals,
        discount: discount ? { code: discount.code, amount: discount.amount } : null,
        reused: false,
      })
    } catch (error) {
      if (error instanceof CheckoutError) {
        return res.status(error.status).json({ error: error.message })
      }

      const message = paymentErrorMessage(error)
      const status = error instanceof Stripe.errors.StripeError ? 502 : 500
      console.error('[payments] create-payment-intent failed', error)
      return res.status(status).json({ error: message })
    }
  },
)

paymentsRouter.post('/quote', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const discountCode = typeof req.body?.discountCode === 'string' ? req.body.discountCode : ''
    if (!discountCode.trim()) {
      return res.status(400).json({ error: 'Enter a discount code.' })
    }

    const validated = await validateCheckoutItems(
      items.map((item: Record<string, unknown>) => ({
        productId: String(item.productId ?? ''),
        title: String(item.title ?? ''),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        size: String(item.size ?? ''),
        colorName: String(item.colorName ?? ''),
      })),
      { email, discountCode },
    )

    return res.json({
      totals: validated.totals,
      discount: validated.discount
        ? { code: validated.discount.code, amount: validated.discount.amount }
        : null,
    })
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('[payments] quote failed', error)
    return res.status(500).json({ error: 'Unable to apply that code right now.' })
  }
})
