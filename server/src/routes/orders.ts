import { Router } from 'express'

import { stripe } from '../lib/stripe.js'
import type { AuthedRequest } from '../middleware/auth.js'
import { optionalUser } from '../middleware/auth.js'
import { getOrderConfirmation, syncOrderFromPaymentIntent } from '../services/orderService.js'
import { requireSupabaseAdmin } from '../lib/supabase.js'

export const ordersRouter = Router()

/**
 * Confirmation + status lookup. Guests must supply the checkout email.
 * Signed-in customers may use their session if the order is attached to their account.
 * If the webhook is late, this retrieves the PaymentIntent from Stripe and updates the order.
 */
ordersRouter.get('/:id/status', optionalUser, async (req, res) => {
  const orderId = typeof req.params.id === 'string' ? req.params.id.trim() : ''
  const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : ''
  const user = (req as AuthedRequest).user

  if (!orderId) {
    return res.status(400).json({ error: 'Order id is required.' })
  }

  if (!user && !email) {
    return res.status(400).json({ error: 'Order id and email are required.' })
  }

  try {
    await syncPendingPaymentFromStripe(orderId)

    const confirmation = await getOrderConfirmation({
      orderId,
      email: email || user?.email,
      userId: user?.id,
    })

    if (!confirmation) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    return res.json(confirmation)
  } catch (error) {
    console.error('[orders] status lookup failed', error)
    return res.status(500).json({ error: 'Unable to look up this order right now.' })
  }
})

async function syncPendingPaymentFromStripe(orderId: string) {
  const db = requireSupabaseAdmin()
  const { data, error } = await db
    .from('orders')
    .select('stripe_payment_intent_id, payment_status')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data?.stripe_payment_intent_id) return
  if (data.payment_status === 'paid' || data.payment_status === 'refunded') return

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(data.stripe_payment_intent_id)
    await syncOrderFromPaymentIntent(paymentIntent)
  } catch (retrieveError) {
    console.warn('[orders] stripe retrieve skipped', retrieveError)
  }
}
