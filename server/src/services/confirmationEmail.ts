import type Stripe from 'stripe'

import { stripe } from '../lib/stripe.js'
import { requireSupabaseAdmin } from '../lib/supabase.js'

type ConfirmationOrder = {
  id: string
  email: string
  orderNumber: string
  confirmationEmailSentAt: string | null
}

/**
 * Confirmation mail uses the existing Stripe receipt (receipt_email on the PaymentIntent).
 * No second email provider is added. This records a single send after server-side payment
 * confirmation so webhook retries cannot trigger duplicate receipts from this app.
 */
export async function recordConfirmationEmailIfNeeded(
  order: ConfirmationOrder,
  paymentIntent: Stripe.PaymentIntent,
): Promise<boolean> {
  if (order.confirmationEmailSentAt) {
    return false
  }

  const receiptEmail = paymentIntent.receipt_email?.trim().toLowerCase()
  if (!receiptEmail) {
    try {
      await stripe.paymentIntents.update(paymentIntent.id, {
        receipt_email: order.email,
      })
    } catch (error) {
      console.error('[email] unable to attach Stripe receipt email', {
        orderId: order.id,
        error,
      })
    }
  }

  const supabaseAdmin = requireSupabaseAdmin()
  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      confirmation_email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .is('confirmation_email_sent_at', null)

  if (error) {
    console.warn('[email] confirmation stamp skipped (column may be missing)', error.message)
    return false
  }

  return true
}

export function buildOrderConfirmationHtml(args: {
  orderNumber: string
  email: string
  items: Array<{ title: string; quantity: number; unitPrice: number }>
  subtotal: number
  shipping: number
  tax: number
  total: number
  currency: string
  shippingAddress?: string
}): string {
  const money = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: args.currency || 'USD',
    }).format(value)

  const rows = args.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#171717;">${escapeHtml(item.title)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#525252;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#171717;text-align:right;">${money(item.unitPrice * item.quantity)}</td>
        </tr>`,
    )
    .join('')

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f5;font-family:Georgia,Times,serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e5e5;padding:32px;">
        <p style="margin:0;letter-spacing:0.28em;font-size:11px;color:#737373;text-transform:uppercase;">KREWNOX</p>
        <h1 style="margin:16px 0 8px;font-size:28px;font-weight:400;color:#0a0a0a;">Order confirmed</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#525252;">Order ${escapeHtml(args.orderNumber)} · Receipt sent to ${escapeHtml(args.email)}</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:14px;color:#525252;">
          <tr><td style="padding:4px 0;">Subtotal</td><td style="text-align:right;">${money(args.subtotal)}</td></tr>
          <tr><td style="padding:4px 0;">Shipping</td><td style="text-align:right;">${args.shipping === 0 ? 'Complimentary' : money(args.shipping)}</td></tr>
          <tr><td style="padding:4px 0;">Tax</td><td style="text-align:right;">${money(args.tax)}</td></tr>
          <tr><td style="padding:12px 0 0;font-size:16px;color:#0a0a0a;"><strong>Total</strong></td><td style="padding:12px 0 0;text-align:right;color:#0a0a0a;"><strong>${money(args.total)}</strong></td></tr>
        </table>
        ${
          args.shippingAddress
            ? `<p style="margin:24px 0 0;font-size:13px;color:#525252;"><strong style="color:#171717;">Shipping</strong><br/>${escapeHtml(args.shippingAddress)}</p>`
            : ''
        }
        <p style="margin:24px 0 0;font-size:12px;color:#737373;">Returns follow the store refund policy. This message is sent only after Stripe confirms payment.</p>
      </div>
    </div>
  </body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
