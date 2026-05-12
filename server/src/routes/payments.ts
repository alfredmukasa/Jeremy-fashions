import { Router } from 'express'

import { createUserSupabase } from '../lib/supabase.js'
import { stripe } from '../lib/stripe.js'
import type { AuthedRequest } from '../middleware/auth.js'
import { requireUser } from '../middleware/auth.js'
import { validateCreatePaymentIntent } from '../middleware/validateCheckout.js'
import {
  attachPaymentIntent,
  CheckoutError,
  createPendingOrder,
  findOrderByIdempotencyKey,
  validateCheckoutItems,
} from '../services/orderService.js'
import type { CreatePaymentIntentBody } from '../types.js'

export const paymentsRouter = Router()

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
      if (body.email !== user.email.toLowerCase()) {
        return res.status(400).json({ error: 'Checkout email must match your signed-in account.' })
      }

      const accessToken = (req as AuthedRequest).accessToken
      if (!accessToken) {
        return res.status(401).json({ error: 'Authentication is required to checkout.' })
      }

      const db = createUserSupabase(accessToken)
      const existing = await findOrderByIdempotencyKey(db, body.idempotencyKey)
      if (existing?.stripe_payment_intent_id) {
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

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(totals.total * 100),
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
      console.error('[payments] create-payment-intent failed', error)
      return res.status(500).json({ error: 'Unable to start payment. Please try again.' })
    }
  },
)
