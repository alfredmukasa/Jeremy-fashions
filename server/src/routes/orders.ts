import { Router } from 'express'

import { requireSupabaseAdmin } from '../lib/supabase.js'

export const ordersRouter = Router()

/**
 * Public order-status lookup for guest checkout confirmation polling. No session is
 * available for a guest, so access is scoped by requiring both the (unguessable) order id
 * and the email used at checkout — enough to prevent enumeration without needing an account.
 */
ordersRouter.get('/:id/status', async (req, res) => {
  const orderId = req.params.id?.trim()
  const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : ''

  if (!orderId || !email) {
    return res.status(400).json({ error: 'Order id and email are required.' })
  }

  try {
    const db = requireSupabaseAdmin()
    const { data, error } = await db
      .from('orders')
      .select('id, status, payment_status, total_amount, currency, email')
      .eq('id', orderId)
      .maybeSingle()

    if (error || !data || data.email.trim().toLowerCase() !== email) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    return res.json({
      orderId: data.id,
      status: data.status,
      paymentStatus: data.payment_status,
      totalAmount: Number(data.total_amount),
      currency: data.currency,
    })
  } catch (error) {
    console.error('[orders] status lookup failed', error)
    return res.status(500).json({ error: 'Unable to look up order status.' })
  }
})
