import { Router } from 'express'
import type Stripe from 'stripe'

import { config } from '../config.js'
import { stripe } from '../lib/stripe.js'
import {
  claimWebhookEvent,
  releaseWebhookEvent,
  markOrderCancelledFromIntent,
  markOrderFailedFromIntent,
  markOrderPaidFromIntent,
  markOrderProcessingFromIntent,
  markOrderRefundedFromCharge,
  resolveOrderIdFromStripeEvent,
} from '../services/orderService.js'

export const webhooksRouter = Router()

webhooksRouter.post('/stripe', async (req, res) => {
  if (!config.stripeWebhookSecret) {
    return res.status(503).json({ error: 'Stripe webhook secret is not configured.' })
  }

  const signature = req.headers['stripe-signature']
  if (!signature || Array.isArray(signature)) {
    return res.status(400).send('Missing Stripe signature header.')
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, config.stripeWebhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature.'
    console.error('[webhooks] signature verification failed', message)
    return res.status(400).send(`Webhook Error: ${message}`)
  }

  try {
    const orderId = await resolveOrderIdFromStripeEvent(event)
    const claim = await claimWebhookEvent(event.id, event.type, orderId)
    if (claim === 'duplicate') {
      return res.json({ received: true, duplicate: true })
    }

    switch (event.type) {
      case 'payment_intent.processing':
        await markOrderProcessingFromIntent(event.data.object as Stripe.PaymentIntent, event.id)
        break
      case 'payment_intent.succeeded':
        await markOrderPaidFromIntent(event.data.object as Stripe.PaymentIntent, event.id)
        break
      case 'payment_intent.payment_failed':
        await markOrderFailedFromIntent(event.data.object as Stripe.PaymentIntent, event.id)
        break
      case 'payment_intent.canceled':
        await markOrderCancelledFromIntent(event.data.object as Stripe.PaymentIntent, event.id)
        break
      case 'charge.refunded':
        await markOrderRefundedFromCharge(event.data.object as Stripe.Charge, event.id)
        break
      default:
        break
    }

    return res.json({ received: true })
  } catch (error) {
    console.error('[webhooks] handler failed', error)
    await releaseWebhookEvent(event.id)
    return res.status(500).json({ error: 'Webhook handler failed.' })
  }
})
