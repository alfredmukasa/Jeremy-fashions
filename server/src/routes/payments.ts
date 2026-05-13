import { Router } from 'express'
import Stripe from 'stripe'

import { createUserSupabase } from '../lib/supabase.js'
import { stripe } from '../lib/stripe.js'
import type { AuthedRequest } from '../middleware/auth.js'
import { requireUser } from '../middleware/auth.js'
import { validateCreatePaymentIntent } from '../middleware/validateCheckout.js'
import {
  attachPaymentIntent,
  CheckoutError,
  clearOrderPaymentIntent,
  createPendingOrder,
  findOrderByIdempotencyKey,
  validateCheckoutItems,
} from '../services/orderService.js'
import type { CreatePaymentIntentBody } from '../types.js'

export const paymentsRouter = Router()

function paymentErrorMessage(error: unknown): string {
  if (error instanceof Stripe.errors.StripeError) {
    if (error.type === 'StripeAuthenticationError') {
      return 'Payment service is not configured correctly. Check Stripe keys on the server.'
    }

    return error.message || 'Payment provider rejected the request.'
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Unable to start payment. Please try again.'
}

paymentsRouter.post(
  '/create-payment-intent',
  requireUser,
  validateCreatePaymentIntent,
  async (req, res) => {
    try {
      const user = (req as AuthedRequest).user
      if (!user) {
        return res.status(401).json({ error: 'Authentication is required to checkout.' })
      }

      const body = req.body as CreatePaymentIntentBody
      const accountEmail = user.email.trim().toLowerCase()
      if (body.email !== accountEmail) {
        return res.status(400).json({ error: 'Checkout email must match your signed-in account.' })
      }

      const accessToken = (req as AuthedRequest).accessToken
      if (!accessToken) {
        return res.status(401).json({ error: 'Authentication is required to checkout.' })
      }

      const db = createUserSupabase(accessToken)
      const existing = await findOrderByIdempotencyKey(db, body.idempotencyKey)
      if (existing?.stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id)
          if (paymentIntent.client_secret) {
            return res.json({
              orderId: existing.id,
              clientSecret: paymentIntent.client_secret,
              paymentIntentId: paymentIntent.id,
              totals: {
                total: Number(existing.total_amount),
                currency: existing.currency,
              },
              reused: true,
            })
          }
        } catch (retrieveError) {
          console.warn('[payments] stale payment intent; creating a new one', {
            orderId: existing.id,
            paymentIntentId: existing.stripe_payment_intent_id,
            error: retrieveError,
          })
          await clearOrderPaymentIntent(db, existing.id)
        }
      }

      if (existing?.payment_status === 'paid') {
        return res.status(409).json({ error: 'This checkout has already been paid.' })
      }

      const { items, totals } = await validateCheckoutItems(body.items)
      const order =
        existing ??
        (await createPendingOrder(db, {
          userId: user.id,
          email: body.email,
          idempotencyKey: body.idempotencyKey,
          items,
          totals,
          shippingAddress: body.shippingAddress,
          billingAddress: body.billingAddress,
          billingSameAsShipping: body.billingSameAsShipping,
        }))

      const amountInCents = Math.round(totals.total * 100)
      if (amountInCents < 50) {
        throw new CheckoutError('Order total must be at least $0.50 before payment can start.', 400)
      }

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: totals.currency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
          receipt_email: body.email,
          metadata: {
            order_id: order.id,
            user_id: user.id,
            idempotency_key: body.idempotencyKey,
          },
        },
        {
          idempotencyKey: body.idempotencyKey,
        },
      )

      if (!paymentIntent.client_secret) {
        throw new CheckoutError('Stripe did not return a client secret.', 500)
      }

      await attachPaymentIntent(db, order.id, paymentIntent.id)

      return res.json({
        orderId: order.id,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        totals,
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
