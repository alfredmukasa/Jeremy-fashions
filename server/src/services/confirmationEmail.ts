import type { SupabaseClient } from '@supabase/supabase-js'

import { isValidContactEmail, resolveConfiguredSupportEmail } from './contactMail.js'

export type ReceiptLine = {
  title: string
  size: string | null
  color: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type ReceiptContent = {
  orderNumber: string
  email: string
  items: ReceiptLine[]
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
  currency: string
  shippingAddress: string | null
}

export type ReceiptDelivery = {
  delivered: boolean
  provider: 'resend' | 'unconfigured'
}

type MailEnv = {
  resendApiKey?: string
  resendFrom?: string
  replyTo?: string
}

const PAID_STATUS = 'paid'

/**
 * Receipts go out only after the order is paid, and only once.
 * Unpaid, failed, canceled, and refunded rows are skipped. A stamp in
 * confirmation_email_sent_at blocks a second send when Stripe retries.
 */
export function shouldSendReceipt(paymentStatus: string, confirmationEmailSentAt: string | null | undefined): boolean {
  return paymentStatus === PAID_STATUS && !confirmationEmailSentAt
}

export function currencyCode(value: unknown): string {
  if (typeof value === 'string' && /^[A-Za-z]{3}$/.test(value.trim())) {
    return value.trim().toUpperCase()
  }
  return 'CAD'
}

export function formatReceiptMoney(value: number, currency: string): string {
  const code = currencyCode(currency)
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: code }).format(value)
}

export function formatShippingAddress(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const fullName =
    typeof value.fullName === 'string' ? value.fullName.trim() : typeof value.full_name === 'string' ? value.full_name.trim() : ''
  const line1 = typeof value.line1 === 'string' ? value.line1.trim() : ''
  const line2 = typeof value.line2 === 'string' ? value.line2.trim() : ''
  const city = typeof value.city === 'string' ? value.city.trim() : ''
  const region = typeof value.region === 'string' ? value.region.trim() : ''
  const postalCode =
    typeof value.postalCode === 'string'
      ? value.postalCode.trim()
      : typeof value.postal_code === 'string'
        ? value.postal_code.trim()
        : ''
  const country = typeof value.country === 'string' ? value.country.trim() : ''
  if (!fullName && !line1) return null
  const cityLine = [city, region, postalCode].filter(Boolean).join(' ')
  const lines = [fullName, line1, line2, cityLine, country].filter(Boolean)
  return lines.length ? lines.join('\n') : null
}

export function buildOrderConfirmationText(args: ReceiptContent): string {
  const money = (value: number) => formatReceiptMoney(value, args.currency)
  const itemLines = args.items.map((item) => {
    return [
      item.title,
      `Size: ${item.size || '—'}`,
      `Color: ${item.color || '—'}`,
      `Quantity: ${item.quantity}`,
      `Price: ${money(item.lineTotal)}`,
    ].join(' | ')
  })

  return [
    'KREWNOX',
    'Order receipt',
    `Order number: ${args.orderNumber}`,
    `Currency: ${currencyCode(args.currency)}`,
    '',
    'Items',
    ...(itemLines.length ? itemLines : ['No line items were stored on this order.']),
    '',
    `Subtotal: ${money(args.subtotal)}`,
    `Discount: ${money(args.discount)}`,
    `Shipping: ${money(args.shipping)}`,
    `Tax: ${money(args.tax)}`,
    `Total: ${money(args.total)}`,
    '',
    args.shippingAddress ? `Shipping address:\n${args.shippingAddress}` : 'Shipping address: not stored',
    '',
    'This receipt is sent after payment is confirmed. Unpaid, failed, and canceled payments do not receive one.',
  ].join('\n')
}

export function buildOrderConfirmationHtml(args: ReceiptContent): string {
  const money = (value: number) => formatReceiptMoney(value, args.currency)
  const rows = args.items
    .map(
      (item) => `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#171717;">
            ${escapeHtml(item.title)}
            <div style="margin-top:4px;font-size:12px;color:#525252;">Size: ${escapeHtml(item.size || '—')} · Color: ${escapeHtml(item.color || '—')}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#525252;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#171717;text-align:right;">${money(item.lineTotal)}</td>
        </tr>`,
    )
    .join('')

  const address = args.shippingAddress
    ? `<p style="margin:24px 0 0;font-size:13px;color:#525252;"><strong style="color:#171717;">Shipping address</strong><br/>${escapeHtml(args.shippingAddress).replaceAll('\n', '<br/>')}</p>`
    : ''

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f5;font-family:Georgia,Times,serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e5e5;padding:32px;">
        <p style="margin:0;letter-spacing:0.28em;font-size:11px;color:#737373;text-transform:uppercase;">KREWNOX</p>
        <h1 style="margin:16px 0 8px;font-size:28px;font-weight:400;color:#0a0a0a;">Order receipt</h1>
        <p style="margin:0 0 8px;font-size:14px;color:#525252;">Order number ${escapeHtml(args.orderNumber)}</p>
        <p style="margin:0 0 24px;font-size:14px;color:#525252;">Currency: ${escapeHtml(currencyCode(args.currency))}</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#737373;">Item</th>
              <th style="text-align:center;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#737373;">Qty</th>
              <th style="text-align:right;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#737373;">Price</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:14px;color:#525252;">
          <tr><td style="padding:4px 0;">Subtotal</td><td style="text-align:right;">${money(args.subtotal)}</td></tr>
          <tr><td style="padding:4px 0;">Discount</td><td style="text-align:right;">${money(args.discount)}</td></tr>
          <tr><td style="padding:4px 0;">Shipping</td><td style="text-align:right;">${money(args.shipping)}</td></tr>
          <tr><td style="padding:4px 0;">Tax</td><td style="text-align:right;">${money(args.tax)}</td></tr>
          <tr><td style="padding:12px 0 0;font-size:16px;color:#0a0a0a;"><strong>Total</strong></td><td style="padding:12px 0 0;text-align:right;color:#0a0a0a;"><strong>${money(args.total)}</strong></td></tr>
        </table>
        ${address}
        <p style="margin:24px 0 0;font-size:12px;color:#737373;">This receipt is sent after payment is confirmed. Unpaid, failed, and canceled payments do not receive one.</p>
      </div>
    </div>
  </body>
</html>`
}

export async function deliverReceiptEmail(
  receipt: ReceiptContent,
  env: MailEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<ReceiptDelivery> {
  if (!env.resendApiKey || !env.resendFrom) {
    console.warn('[email] RESEND_API_KEY or RESEND_FROM_EMAIL is not set; receipt was not emailed', {
      orderNumber: receipt.orderNumber,
    })
    return { delivered: false, provider: 'unconfigured' }
  }

  if (!isValidContactEmail(receipt.email)) {
    throw new Error('Receipt recipient is not a valid email address.')
  }

  const payload: Record<string, unknown> = {
    from: env.resendFrom,
    to: [receipt.email],
    subject: `Your Krewnox receipt · ${receipt.orderNumber}`,
    html: buildOrderConfirmationHtml(receipt),
    text: buildOrderConfirmationText(receipt),
  }
  if (env.replyTo && isValidContactEmail(env.replyTo)) {
    payload.reply_to = env.replyTo
  }

  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Resend rejected the receipt email (${response.status}): ${detail.slice(0, 300)}`)
  }

  return { delivered: true, provider: 'resend' }
}

type OrderMailRow = {
  id: string
  email?: string | null
  order_number?: string | null
  payment_status?: string | null
  total_amount?: number | string | null
  subtotal_amount?: number | string | null
  shipping_amount?: number | string | null
  tax_amount?: number | string | null
  discount_amount?: number | string | null
  currency?: string | null
  shipping_address?: unknown
  payment_metadata?: Record<string, unknown> | null
  confirmation_email_sent_at?: string | null
  order_items?: Array<{
    title?: string | null
    quantity?: number | null
    unit_price?: number | string | null
    size?: string | null
    color_name?: string | null
    line_total?: number | string | null
  }> | null
}

const RECEIPT_SELECT =
  'id, email, order_number, payment_status, total_amount, subtotal_amount, shipping_amount, tax_amount, discount_amount, currency, shipping_address, payment_metadata, confirmation_email_sent_at, order_items ( title, quantity, unit_price, size, color_name, line_total )'

/**
 * Sends one Resend receipt when an order is paid and confirmation_email_sent_at is empty.
 * The stamp is claimed before the provider call and released if Resend rejects it, so a
 * webhook retry or the order-status sync can send exactly once.
 */
export async function sendOrderReceiptIfNeeded(orderId: string): Promise<boolean> {
  const { requireSupabaseAdmin } = await import('../lib/supabase.js')
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin.from('orders').select(RECEIPT_SELECT).eq('id', orderId).maybeSingle()
  if (error || !data) {
    console.warn('[email] receipt skipped; order could not be loaded', error?.message ?? orderId)
    return false
  }

  const row = data as OrderMailRow
  if (!shouldSendReceipt(String(row.payment_status ?? ''), row.confirmation_email_sent_at)) {
    return false
  }

  const email = String(row.email ?? '').trim().toLowerCase()
  if (!isValidContactEmail(email)) {
    console.warn('[email] receipt skipped; order email is missing', { orderId })
    return false
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY or RESEND_FROM_EMAIL is not set; paid order was not emailed', { orderId })
    return false
  }

  const claimedAt = new Date().toISOString()
  const claim = await supabaseAdmin
    .from('orders')
    .update({ confirmation_email_sent_at: claimedAt, updated_at: claimedAt })
    .eq('id', orderId)
    .eq('payment_status', PAID_STATUS)
    .is('confirmation_email_sent_at', null)
    .select('id')
    .maybeSingle()

  if (claim.error || !claim.data) {
    return false
  }

  try {
    await deliverReceiptEmail(receiptFromOrder(row, email), {
      resendApiKey: apiKey,
      resendFrom: from,
      replyTo: await readSupportReplyTo(supabaseAdmin),
    })
    return true
  } catch (sendError) {
    console.error('[email] receipt was not accepted; stamp released for retry', {
      orderId,
      error: sendError instanceof Error ? sendError.message : 'unknown',
    })
    await supabaseAdmin
      .from('orders')
      .update({ confirmation_email_sent_at: null, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('confirmation_email_sent_at', claimedAt)
    return false
  }
}

function receiptFromOrder(row: OrderMailRow, email: string): ReceiptContent {
  const metadata = row.payment_metadata ?? {}
  const currency = currencyCode(row.currency ?? metadata.currency)
  const items = (row.order_items ?? []).map((item) => {
    const quantity = Number(item.quantity ?? 0)
    const unitPrice = asMoney(item.unit_price)
    const lineTotal = item.line_total == null ? roundMoney(unitPrice * quantity) : asMoney(item.line_total)
    return {
      title: String(item.title ?? 'Item'),
      size: item.size?.trim() || null,
      color: item.color_name?.trim() || null,
      quantity,
      unitPrice,
      lineTotal,
    }
  })

  return {
    orderNumber: row.order_number?.trim() || `KN-${row.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    email,
    items,
    subtotal: asMoney(row.subtotal_amount ?? metadata.subtotal),
    discount: asMoney(row.discount_amount ?? metadata.discount),
    shipping: asMoney(row.shipping_amount ?? metadata.shipping),
    tax: asMoney(row.tax_amount ?? metadata.tax),
    total: asMoney(row.total_amount),
    currency,
    shippingAddress: formatShippingAddress(row.shipping_address),
  }
}

async function readSupportReplyTo(supabaseAdmin: SupabaseClient): Promise<string | undefined> {
  try {
    const { data, error } = await supabaseAdmin.from('site_settings').select('key, value').in('key', ['contact_recipient', 'storefront'])
    if (error) return undefined
    const contact = data?.find((entry) => entry.key === 'contact_recipient')?.value
    const storefront = data?.find((entry) => entry.key === 'storefront')?.value
    return resolveConfiguredSupportEmail(contact, storefront)
  } catch {
    return undefined
  }
}

function asMoney(value: unknown): number {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(amount) ? roundMoney(amount) : 0
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
