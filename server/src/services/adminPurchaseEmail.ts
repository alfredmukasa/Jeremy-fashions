import type { SupabaseClient } from '@supabase/supabase-js'

import { currencyCode, formatReceiptMoney } from './confirmationEmail.js'
import {
  isValidContactEmail,
  resolveConfiguredSupportEmail,
} from './contactMail.js'

export type PurchaseEmailPayload = {
  from: string
  to: string[]
  subject: string
  text: string
}
type PurchaseOrder = {
  id: string
  order_number: string | null
  email: string
  total_amount: number
  currency: string | null
  order_items: Array<{
    title: string
    quantity: number
    size: string | null
    color_name: string | null
  }>
}

export async function readPurchaseEmailSettings(client: SupabaseClient) {
  const { data: settings, error } = await client
    .from('site_settings')
    .select('key, value')
    .in('key', ['purchase_notifications', 'contact_recipient', 'storefront'])
  if (error) throw new Error('Purchase email settings could not be loaded.')
  const values = Object.fromEntries(
    (settings ?? []).map((row) => [row.key, row.value]),
  )
  const override =
    typeof values.purchase_notifications?.email === 'string'
      ? values.purchase_notifications.email.trim()
      : ''
  const to =
    override ||
    resolveConfiguredSupportEmail(values.contact_recipient, values.storefront)
  if (!isValidContactEmail(to))
    throw new Error('Purchase notification email is invalid.')
  return {
    enabled: values.purchase_notifications?.enabled !== false,
    to: to.toLowerCase(),
  }
}

export function buildAdminPurchaseEmail(
  order: PurchaseOrder,
  from: string,
  to: string,
  adminOrdersUrl: string,
): PurchaseEmailPayload {
  const number =
    order.order_number || `KN-${order.id.slice(0, 8).toUpperCase()}`
  return {
    from,
    to: [to],
    subject: `New paid KREWNOX order ${number}`,
    text: [
      'New purchase — payment confirmed',
      `Order: ${number}`,
      `Customer: ${order.email}`,
      `Total: ${formatReceiptMoney(Number(order.total_amount), currencyCode(order.currency))} ${currencyCode(order.currency)}`,
      '',
      'Items:',
      ...order.order_items.map(
        (item) =>
          `${item.quantity} × ${item.title}${item.size ? ` | Size: ${item.size}` : ''}${item.color_name ? ` | Color: ${item.color_name}` : ''}`,
      ),
      '',
      `Review and fulfill this order: ${adminOrdersUrl}`,
    ].join('\n'),
  }
}

export async function deliverAdminPurchaseEmail(
  orderId: string,
  payload: PurchaseEmailPayload,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
) {
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `admin-purchase/${orderId}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok)
    throw new Error(`Purchase email provider returned ${response.status}.`)
}

// A failed email never rolls back a payment. The webhook returns a retryable
// failure; subsequent attempts reuse the saved payload and provider key.
export async function sendAdminPurchaseEmailIfNeeded(
  orderId: string,
  db?: SupabaseClient,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const client =
    db ?? (await import('../lib/supabase.js')).requireSupabaseAdmin()
  const { data: notice, error } = await client
    .from('admin_purchase_notifications')
    .select('order_id, email_sent_at, email_payload')
    .eq('order_id', orderId)
    .maybeSingle()
  if (error) throw new Error('Purchase notification storage is unavailable.')
  // No notice means a historical order from before this feature was enabled.
  if (!notice || notice.email_sent_at) return

  const settings = await readPurchaseEmailSettings(client)
  if (!settings.enabled) return

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey || !from)
    throw new Error(
      'Purchase email is waiting for email service configuration.',
    )

  if (!notice.email_payload) {
    const { data: order, error: orderError } = await client
      .from('orders')
      .select(
        'id, order_number, email, total_amount, currency, order_items(title, quantity, size, color_name)',
      )
      .eq('id', orderId)
      .maybeSingle()
    if (orderError || !order)
      throw new Error('Purchase email order could not be loaded.')
    const base = process.env.VITE_ADMIN_BASE_PATH?.trim() || '/krewnox-admin'
    const path =
      base.startsWith('/') && !base.startsWith('//')
        ? base.replace(/\/+$/, '')
        : '/krewnox-admin'
    const payload = buildAdminPurchaseEmail(
      order as PurchaseOrder,
      from,
      settings.to,
      `https://krewnox.ca${path}/orders`,
    )
    const saved = await client
      .from('admin_purchase_notifications')
      .update({ email_payload: payload })
      .eq('order_id', orderId)
      .is('email_payload', null)
    if (saved.error) throw new Error('Purchase email could not be queued.')
  }

  const claimedAt = new Date().toISOString()
  const staleBefore = new Date(Date.now() - 60_000).toISOString()
  const claim = await client
    .from('admin_purchase_notifications')
    .update({ email_claimed_at: claimedAt })
    .eq('order_id', orderId)
    .is('email_sent_at', null)
    .or(`email_claimed_at.is.null,email_claimed_at.lt.${staleBefore}`)
    .select('email_payload')
    .maybeSingle()
  if (claim.error) throw new Error('Purchase email claim failed.')
  if (!claim.data)
    throw new Error('Purchase email is already being delivered; retry shortly.')
  try {
    await deliverAdminPurchaseEmail(
      orderId,
      claim.data.email_payload as PurchaseEmailPayload,
      apiKey,
      fetchImpl,
    )
    const saved = await client
      .from('admin_purchase_notifications')
      .update({
        email_sent_at: new Date().toISOString(),
        email_claimed_at: null,
        email_last_error: null,
      })
      .eq('order_id', orderId)
      .eq('email_claimed_at', claimedAt)
    if (saved.error)
      throw new Error('Purchase email delivery could not be recorded.')
  } catch (error) {
    await client
      .from('admin_purchase_notifications')
      .update({
        email_claimed_at: null,
        email_last_error:
          'Email delivery pending. Check the email service and retry the payment event.',
      })
      .eq('order_id', orderId)
      .eq('email_claimed_at', claimedAt)
    throw error
  }
}
