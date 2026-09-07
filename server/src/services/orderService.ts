import { randomBytes } from 'node:crypto'

import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

import { recordConfirmationEmailIfNeeded } from './confirmationEmail.js'
import { requireSupabaseAdmin, supabaseAnon } from '../lib/supabase.js'
import type { CheckoutAddress, CheckoutLineItem } from '../types.js'

const SHIPPING_THRESHOLD = 250
const SHIPPING_FLAT = 12
const TAX_RATE = 0.08

export type OrderTotals = {
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  currency: string
}

export type ValidatedCheckout = {
  items: CheckoutLineItem[]
  totals: OrderTotals
}

export type OrderConfirmationItem = {
  title: string
  quantity: number
  unitPrice: number
}

export type OrderConfirmation = {
  orderId: string
  orderNumber: string
  email: string
  status: string
  paymentStatus: string
  createdAt: string
  paidAt: string | null
  totalAmount: number
  subtotalAmount: number
  shippingAmount: number
  taxAmount: number
  discountAmount: number
  refundAmount: number
  currency: string
  items: OrderConfirmationItem[]
  shippingAddress: CheckoutAddress | null
  confirmationEmailSent: boolean
}

export function calculateTotals(items: CheckoutLineItem[], currency = 'USD'): OrderTotals {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
  const tax = roundMoney(subtotal * TAX_RATE)
  const discount = 0
  const total = roundMoney(subtotal + shipping + tax - discount)

  return { subtotal, shipping, tax, discount, total, currency: currency.toUpperCase() }
}

export async function validateCheckoutItems(items: CheckoutLineItem[]): Promise<ValidatedCheckout> {
  if (!items.length) {
    throw new CheckoutError('Your bag is empty.', 400)
  }

  const productIds = [...new Set(items.map((item) => item.productId))]
  const { data: products, error } = await supabaseAnon
    .from('products')
    .select('id, title, price, compare_price, status, stock_quantity, sku')
    .in('id', productIds)

  if (error) {
    throw new CheckoutError('Unable to validate products for checkout.', 500)
  }

  const productMap = new Map((products ?? []).map((product) => [product.id, product]))
  const validated: CheckoutLineItem[] = []

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw new CheckoutError('Each line item must have a quantity between 1 and 20.', 400)
    }

    const product = productMap.get(item.productId)
    if (!product || product.status !== 'active') {
      throw new CheckoutError('One or more items are no longer available.', 400)
    }

    if (product.stock_quantity < item.quantity) {
      throw new CheckoutError(`Insufficient stock for ${product.title}.`, 400)
    }

    const expectedUnitPrice = getSellingPrice(Number(product.price), product.compare_price)

    validated.push({
      productId: item.productId,
      title: product.title,
      quantity: item.quantity,
      unitPrice: expectedUnitPrice,
      size: item.size,
      colorName: item.colorName,
      sku: product.sku ?? item.sku,
    })
  }

  return { items: validated, totals: calculateTotals(validated) }
}

export async function findOrderByIdempotencyKey(db: SupabaseClient, idempotencyKey: string) {
  const { data, error } = await db
    .from('orders')
    .select(
      'id, order_number, stripe_payment_intent_id, payment_status, status, total_amount, currency, payment_metadata',
    )
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (error) {
    if (isMissingColumnError(error)) {
      const fallback = await db
        .from('orders')
        .select('id, stripe_payment_intent_id, payment_status, status, total_amount, currency, payment_metadata')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (fallback.error) {
        throw new CheckoutError('Unable to look up an existing checkout session.', 500)
      }
      return fallback.data
    }
    throw new CheckoutError('Unable to look up an existing checkout session.', 500)
  }

  return data
}

export async function createPendingOrder(
  db: SupabaseClient,
  args: {
    userId: string | null
    email: string
    idempotencyKey: string
    items: CheckoutLineItem[]
    totals: OrderTotals
    shippingAddress: CheckoutAddress
    billingAddress: CheckoutAddress
    billingSameAsShipping: boolean
  },
) {
  const orderNumber = generateOrderNumber()
  const baseRow = {
    user_id: args.userId,
    email: args.email,
    status: 'pending',
    payment_status: 'unpaid',
    total_amount: args.totals.total,
    currency: args.totals.currency,
    shipping_address: toAddressJson(args.shippingAddress),
    billing_address: toAddressJson(args.billingAddress),
    idempotency_key: args.idempotencyKey,
    payment_metadata: {
      subtotal: args.totals.subtotal,
      shipping: args.totals.shipping,
      tax: args.totals.tax,
      discount: args.totals.discount,
      billing_same_as_shipping: args.billingSameAsShipping,
    },
  }

  const upgradedRow = {
    ...baseRow,
    order_number: orderNumber,
    subtotal_amount: args.totals.subtotal,
    shipping_amount: args.totals.shipping,
    tax_amount: args.totals.tax,
    discount_amount: args.totals.discount,
    refund_amount: 0,
  }

  let order = await insertOrder(db, upgradedRow)
  if (!order) {
    order = await insertOrder(db, baseRow)
  }
  if (!order) {
    throw new CheckoutError('Unable to create your order.', 500)
  }

  const created = { ...order, order_number: orderNumber }

  const orderItems = args.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    title: item.title,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    sku: item.sku ?? null,
  }))

  const { error: itemsError } = await db.from('order_items').insert(orderItems)
  if (itemsError) {
    await db.from('orders').delete().eq('id', order.id)
    throw new CheckoutError('Unable to save order line items.', 500)
  }

  return created
}

export async function refreshPendingOrder(
  db: SupabaseClient,
  orderId: string,
  args: {
    items: CheckoutLineItem[]
    totals: OrderTotals
    shippingAddress: CheckoutAddress
    billingAddress: CheckoutAddress
    billingSameAsShipping: boolean
  },
) {
  const { data: current } = await db.from('orders').select('payment_metadata').eq('id', orderId).maybeSingle()
  const existingMeta =
    current?.payment_metadata && typeof current.payment_metadata === 'object'
      ? (current.payment_metadata as Record<string, unknown>)
      : {}

  const upgrade = {
    total_amount: args.totals.total,
    currency: args.totals.currency,
    shipping_address: toAddressJson(args.shippingAddress),
    billing_address: toAddressJson(args.billingAddress),
    subtotal_amount: args.totals.subtotal,
    shipping_amount: args.totals.shipping,
    tax_amount: args.totals.tax,
    discount_amount: args.totals.discount,
    payment_metadata: {
      ...existingMeta,
      subtotal: args.totals.subtotal,
      shipping: args.totals.shipping,
      tax: args.totals.tax,
      discount: args.totals.discount,
      billing_same_as_shipping: args.billingSameAsShipping,
    },
    updated_at: new Date().toISOString(),
  }

  let { error } = await db
    .from('orders')
    .update(upgrade)
    .eq('id', orderId)
    .in('payment_status', ['unpaid', 'failed', 'processing'])

  if (error && isMissingColumnError(error)) {
    const fallback = await db
      .from('orders')
      .update({
        total_amount: args.totals.total,
        currency: args.totals.currency,
        shipping_address: toAddressJson(args.shippingAddress),
        billing_address: toAddressJson(args.billingAddress),
        payment_metadata: upgrade.payment_metadata,
        updated_at: upgrade.updated_at,
      })
      .eq('id', orderId)
      .in('payment_status', ['unpaid', 'failed', 'processing'])
    error = fallback.error
  }

  if (error) {
    throw new CheckoutError('Unable to refresh your checkout session.', 500)
  }

  const { error: deleteError } = await db.from('order_items').delete().eq('order_id', orderId)
  if (deleteError) {
    throw new CheckoutError('Unable to refresh order line items.', 500)
  }

  const { error: itemsError } = await db.from('order_items').insert(
    args.items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      sku: item.sku ?? null,
    })),
  )
  if (itemsError) {
    throw new CheckoutError('Unable to save order line items.', 500)
  }
}

export async function attachPaymentIntent(db: SupabaseClient, orderId: string, paymentIntentId: string) {
  const { error } = await db
    .from('orders')
    .update({
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    throw new CheckoutError('Unable to link payment to your order.', 500)
  }
}

export async function clearOrderPaymentIntent(db: SupabaseClient, orderId: string) {
  const { error } = await db
    .from('orders')
    .update({
      stripe_payment_intent_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    throw new CheckoutError('Unable to reset checkout payment session.', 500)
  }
}

type OrderPaymentRow = {
  id: string
  email?: string
  order_number?: string | null
  payment_status: string
  status?: string
  total_amount?: number | string
  stripe_payment_intent_id: string | null
  payment_metadata: Record<string, unknown> | null
  confirmation_email_sent_at?: string | null
}

export async function releaseWebhookEvent(eventId: string) {
  try {
    const supabaseAdmin = requireSupabaseAdmin()
    await supabaseAdmin.from('stripe_webhook_events').delete().eq('id', eventId)
  } catch {
    // Best-effort undo so Stripe can retry after a handler failure.
  }
}

export async function claimWebhookEvent(
  eventId: string,
  eventType: string,
  orderId?: string | null,
): Promise<'claimed' | 'duplicate' | 'unavailable'> {
  try {
    const supabaseAdmin = requireSupabaseAdmin()
    const { error } = await supabaseAdmin.from('stripe_webhook_events').insert({
      id: eventId,
      event_type: eventType,
      order_id: orderId ?? null,
    })

    if (!error) return 'claimed'
    if (error.code === '23505') return 'duplicate'
    return 'unavailable'
  } catch {
    return 'unavailable'
  }
}

export async function resolveOrderIdFromStripeEvent(event: Stripe.Event): Promise<string | null> {
  const object = event.data.object as { metadata?: { order_id?: string }; payment_intent?: string | { id?: string } }
  const metadataOrderId = object.metadata?.order_id
  if (metadataOrderId) return metadataOrderId

  const paymentIntentId =
    typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id
  if (!paymentIntentId) return null

  const supabaseAdmin = requireSupabaseAdmin()
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()
  return data?.id ?? null
}

async function resolveOrderFromIntent(paymentIntent: Stripe.PaymentIntent): Promise<OrderPaymentRow | null> {
  const orderId = paymentIntent.metadata.order_id
  if (orderId) {
    const row = await selectOrderBy('id', orderId)
    if (row) return row
  }

  return selectOrderBy('stripe_payment_intent_id', paymentIntent.id)
}

function mergePaymentMetadata(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
  event: { id?: string; type: string; stripe_status?: string; amount?: number; currency?: string },
) {
  const base = existing && typeof existing === 'object' ? { ...existing } : {}
  const events = Array.isArray(base.stripe_events) ? [...base.stripe_events] : []
  const eventIds = Array.isArray(base.stripe_event_ids) ? [...base.stripe_event_ids] : []

  if (event.id && eventIds.includes(event.id)) {
    return {
      ...base,
      ...patch,
      stripe_events: events.slice(-20),
      stripe_event_ids: eventIds.slice(-40),
    }
  }

  if (event.id) eventIds.push(event.id)
  events.push({
    id: event.id,
    type: event.type,
    at: new Date().toISOString(),
    stripe_status: event.stripe_status,
    amount: event.amount,
    currency: event.currency,
  })

  return {
    ...base,
    ...patch,
    stripe_events: events.slice(-20),
    stripe_event_ids: eventIds.slice(-40),
  }
}

function alreadyProcessedEvent(existing: OrderPaymentRow, eventId?: string) {
  if (!eventId) return false
  const ids = existing.payment_metadata?.stripe_event_ids
  return Array.isArray(ids) && ids.includes(eventId)
}

function assertPaidAmountMatches(order: OrderPaymentRow, paymentIntent: Stripe.PaymentIntent) {
  const expectedCents = Math.round(Number(order.total_amount ?? 0) * 100)
  const received = paymentIntent.amount_received || paymentIntent.amount
  if (!expectedCents || received !== expectedCents) {
    throw new CheckoutError(
      `Payment amount does not match order total (${received} vs ${expectedCents}).`,
      409,
    )
  }
}

export async function markOrderProcessingFromIntent(paymentIntent: Stripe.PaymentIntent, eventId?: string) {
  const existing = await resolveOrderFromIntent(paymentIntent)
  if (!existing || existing.payment_status === 'paid' || existing.payment_status === 'refunded') {
    return existing
  }
  if (alreadyProcessedEvent(existing, eventId)) return existing

  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'processing',
      stripe_payment_intent_id: paymentIntent.id,
      payment_metadata: mergePaymentMetadata(
        existing.payment_metadata,
        {
          stripe_payment_intent_id: paymentIntent.id,
          stripe_payment_status: paymentIntent.status,
          processing_at: new Date().toISOString(),
        },
        {
          id: eventId,
          type: 'payment_intent.processing',
          stripe_status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .in('payment_status', ['unpaid', 'processing', 'failed'])
    .select('id, payment_status')
    .maybeSingle()

  if (error) {
    throw new CheckoutError('Unable to mark the order as processing.', 500)
  }

  return data ?? existing
}

export async function markOrderPaidFromIntent(paymentIntent: Stripe.PaymentIntent, eventId?: string) {
  const existing = await resolveOrderFromIntent(paymentIntent)
  if (!existing) return null

  if (existing.payment_status === 'paid' || existing.payment_status === 'refunded') {
    return existing
  }
  if (alreadyProcessedEvent(existing, eventId) && existing.payment_status === 'paid') {
    return existing
  }

  assertPaidAmountMatches(existing, paymentIntent)

  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'processing',
      stripe_payment_intent_id: paymentIntent.id,
      payment_metadata: mergePaymentMetadata(
        existing.payment_metadata,
        {
          stripe_payment_intent_id: paymentIntent.id,
          stripe_payment_status: paymentIntent.status,
          stripe_amount_received: paymentIntent.amount_received,
          stripe_currency: paymentIntent.currency,
          stripe_payment_method: paymentIntent.payment_method,
          stripe_latest_charge: paymentIntent.latest_charge,
          paid_at: new Date().toISOString(),
          stock_decremented: true,
        },
        {
          id: eventId,
          type: 'payment_intent.succeeded',
          stripe_status: paymentIntent.status,
          amount: paymentIntent.amount_received,
          currency: paymentIntent.currency,
        },
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .neq('payment_status', 'paid')
    .select('id, payment_status, email, order_number, confirmation_email_sent_at')
    .maybeSingle()

  if (error) {
    throw new CheckoutError('Unable to mark the order as paid.', 500)
  }

  if (data && existing.payment_metadata?.stock_decremented !== true) {
    await decrementStockForOrder(existing.id)
  }

  if (data) {
    await recordConfirmationEmailIfNeeded(
      {
        id: existing.id,
        email: String(data.email ?? existing.email ?? ''),
        orderNumber: String(data.order_number ?? existing.order_number ?? existing.id.slice(0, 8).toUpperCase()),
        confirmationEmailSentAt: data.confirmation_email_sent_at ?? existing.confirmation_email_sent_at ?? null,
      },
      paymentIntent,
    )
  }

  return data ?? existing
}

export async function markOrderFailedFromIntent(paymentIntent: Stripe.PaymentIntent, eventId?: string) {
  const existing = await resolveOrderFromIntent(paymentIntent)
  if (!existing || existing.payment_status === 'paid' || existing.payment_status === 'refunded') {
    return existing
  }
  if (alreadyProcessedEvent(existing, eventId)) return existing

  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'failed',
      stripe_payment_intent_id: paymentIntent.id,
      payment_metadata: mergePaymentMetadata(
        existing.payment_metadata,
        {
          stripe_payment_intent_id: paymentIntent.id,
          stripe_payment_status: paymentIntent.status,
          stripe_last_payment_error: paymentIntent.last_payment_error,
          failed_at: new Date().toISOString(),
        },
        {
          id: eventId,
          type: 'payment_intent.payment_failed',
          stripe_status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .neq('payment_status', 'paid')
    .select('id, payment_status')
    .maybeSingle()

  if (error) {
    throw new CheckoutError('Unable to mark the order as failed.', 500)
  }

  return data
}

export async function markOrderCancelledFromIntent(paymentIntent: Stripe.PaymentIntent, eventId?: string) {
  const existing = await resolveOrderFromIntent(paymentIntent)
  if (!existing || existing.payment_status === 'paid' || existing.payment_status === 'refunded') {
    return existing
  }

  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: existing.payment_status === 'failed' ? 'failed' : 'unpaid',
      status: 'cancelled',
      payment_metadata: mergePaymentMetadata(
        existing.payment_metadata,
        {
          stripe_payment_status: paymentIntent.status,
          cancelled_at: new Date().toISOString(),
        },
        {
          id: eventId,
          type: 'payment_intent.canceled',
          stripe_status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .neq('payment_status', 'paid')
    .select('id, payment_status')
    .maybeSingle()

  if (error) {
    throw new CheckoutError('Unable to mark the order as cancelled.', 500)
  }

  return data
}

export async function markOrderRefundedFromCharge(charge: Stripe.Charge, eventId?: string) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!paymentIntentId) return null

  const supabaseAdmin = requireSupabaseAdmin()
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('orders')
    .select('id, payment_status, status, payment_metadata, total_amount, refund_amount')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (existingError || !existing) {
    return null
  }

  if (alreadyProcessedEvent(existing as unknown as OrderPaymentRow, eventId)) {
    return existing
  }

  const refundedAmount = charge.amount_refunded
  const orderTotal = Math.round(Number(existing.total_amount) * 100)
  const paymentStatus = refundedAmount > 0 && refundedAmount < orderTotal ? 'partial_refund' : 'refunded'
  const refundAmount = roundMoney(refundedAmount / 100)
  const fulfillmentStatus = paymentStatus === 'refunded' && existing.status === 'pending' ? 'cancelled' : existing.status

  const upgrade = {
    payment_status: paymentStatus,
    status: fulfillmentStatus,
    refund_amount: refundAmount,
    payment_metadata: mergePaymentMetadata(existing.payment_metadata as Record<string, unknown> | null, {
      stripe_charge_id: charge.id,
      stripe_amount_refunded: charge.amount_refunded,
      stripe_refunded: charge.refunded,
      refunded_at: new Date().toISOString(),
    }, {
      id: eventId,
      type: 'charge.refunded',
      stripe_status: charge.status,
      amount: charge.amount_refunded,
      currency: charge.currency,
    }),
    updated_at: new Date().toISOString(),
  }

  let { data, error } = await supabaseAdmin.from('orders').update(upgrade).eq('id', existing.id).select('id, payment_status').maybeSingle()

  if (error && isMissingColumnError(error)) {
    const fallback = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: upgrade.payment_status,
        status: upgrade.status,
        payment_metadata: upgrade.payment_metadata,
        updated_at: upgrade.updated_at,
      })
      .eq('id', existing.id)
      .select('id, payment_status')
      .maybeSingle()
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    throw new CheckoutError('Unable to mark the order as refunded.', 500)
  }

  return data
}

export async function syncOrderFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  if (paymentIntent.status === 'succeeded') {
    return markOrderPaidFromIntent(paymentIntent)
  }
  if (paymentIntent.status === 'processing') {
    return markOrderProcessingFromIntent(paymentIntent)
  }
  if (paymentIntent.status === 'canceled') {
    return markOrderCancelledFromIntent(paymentIntent)
  }
  if (paymentIntent.status === 'requires_payment_method' && paymentIntent.last_payment_error) {
    return markOrderFailedFromIntent(paymentIntent)
  }
  return null
}

export async function getOrderConfirmation(args: {
  orderId: string
  email?: string
  userId?: string
}): Promise<OrderConfirmation | null> {
  const supabaseAdmin = requireSupabaseAdmin()
  const select = `
    id,
    order_number,
    created_at,
    email,
    user_id,
    status,
    payment_status,
    total_amount,
    subtotal_amount,
    shipping_amount,
    tax_amount,
    discount_amount,
    refund_amount,
    currency,
    shipping_address,
    stripe_payment_intent_id,
    payment_metadata,
    confirmation_email_sent_at,
    order_items ( title, quantity, unit_price )
  `
  const fallbackSelect = `
    id,
    created_at,
    email,
    user_id,
    status,
    payment_status,
    total_amount,
    currency,
    shipping_address,
    stripe_payment_intent_id,
    payment_metadata,
    order_items ( title, quantity, unit_price )
  `

  let { data, error } = await supabaseAdmin.from('orders').select(select).eq('id', args.orderId).maybeSingle()
  if (error && isMissingColumnError(error)) {
    const fallback = await supabaseAdmin.from('orders').select(fallbackSelect).eq('id', args.orderId).maybeSingle()
    data = fallback.data as typeof data
    error = fallback.error
  }

  if (error || !data) return null

  const row = data as unknown as ConfirmationRow
  const email = row.email.trim().toLowerCase()
  const ownsAsUser = Boolean(args.userId && row.user_id === args.userId)
  const ownsAsEmail = Boolean(args.email && email === args.email.trim().toLowerCase())
  if (!ownsAsUser && !ownsAsEmail) return null

  const metadata = (row.payment_metadata ?? {}) as Record<string, unknown>
  const items = (row.order_items ?? []).map((item) => ({
    title: item.title,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
  }))

  return {
    orderId: row.id,
    orderNumber: row.order_number || `KN-${row.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    email: row.email,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    paidAt: typeof metadata.paid_at === 'string' ? metadata.paid_at : null,
    totalAmount: Number(row.total_amount),
    subtotalAmount: Number(row.subtotal_amount ?? metadata.subtotal ?? row.total_amount),
    shippingAmount: Number(row.shipping_amount ?? metadata.shipping ?? 0),
    taxAmount: Number(row.tax_amount ?? metadata.tax ?? 0),
    discountAmount: Number(row.discount_amount ?? metadata.discount ?? 0),
    refundAmount: Number(row.refund_amount ?? (typeof metadata.stripe_amount_refunded === 'number' ? metadata.stripe_amount_refunded / 100 : 0)),
    currency: row.currency,
    items,
    shippingAddress: parseAddress(row.shipping_address),
    confirmationEmailSent: Boolean(row.confirmation_email_sent_at),
  }
}

export class CheckoutError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CheckoutError'
    this.status = status
  }
}

type ConfirmationRow = {
  id: string
  order_number?: string | null
  created_at: string
  email: string
  user_id: string | null
  status: string
  payment_status: string
  total_amount: number | string
  subtotal_amount?: number | string | null
  shipping_amount?: number | string | null
  tax_amount?: number | string | null
  discount_amount?: number | string | null
  refund_amount?: number | string | null
  currency: string
  shipping_address: unknown
  stripe_payment_intent_id: string | null
  payment_metadata: Record<string, unknown> | null
  confirmation_email_sent_at?: string | null
  order_items: Array<{ title: string; quantity: number; unit_price: number | string }> | null
}

async function insertOrder(db: SupabaseClient, row: Record<string, unknown>) {
  const { data, error } = await db
    .from('orders')
    .insert(row)
    .select('id, total_amount, currency')
    .single()

  if (data) return data
  if (error?.code === '23505') {
    throw new CheckoutError('This checkout session was already created. Refresh and try again.', 409)
  }
  if (error && isMissingColumnError(error)) {
    return null
  }
  if (error) {
    throw new CheckoutError('Unable to create your order.', 500)
  }
  return null
}

async function selectOrderBy(
  column: 'id' | 'stripe_payment_intent_id',
  value: string,
): Promise<OrderPaymentRow | null> {
  const supabaseAdmin = requireSupabaseAdmin()
  const select =
    'id, email, order_number, payment_status, status, total_amount, stripe_payment_intent_id, payment_metadata, confirmation_email_sent_at'
  const fallbackSelect = 'id, email, payment_status, status, total_amount, stripe_payment_intent_id, payment_metadata'

  const primary = await supabaseAdmin.from('orders').select(select).eq(column, value).maybeSingle()
  if (!primary.error) {
    return (primary.data as OrderPaymentRow | null) ?? null
  }

  if (isMissingColumnError(primary.error)) {
    const fallback = await supabaseAdmin.from('orders').select(fallbackSelect).eq(column, value).maybeSingle()
    if (fallback.error) {
      throw new CheckoutError('Paid order could not be found.', 500)
    }
    return (fallback.data as unknown as OrderPaymentRow | null) ?? null
  }

  throw new CheckoutError('Paid order could not be found.', 500)
}

async function decrementStockForOrder(orderId: string) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data: items, error } = await supabaseAdmin
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId)

  if (error || !items?.length) return

  for (const item of items) {
    if (!item.product_id) continue
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('stock_quantity')
      .eq('id', item.product_id)
      .maybeSingle()
    if (!product) continue
    const next = Math.max(0, Number(product.stock_quantity) - Number(item.quantity))
    await supabaseAdmin.from('products').update({ stock_quantity: next }).eq('id', item.product_id)
  }
}

function generateOrderNumber() {
  const now = new Date()
  const stamp = `${String(now.getUTCFullYear()).slice(-2)}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
  return `KN-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`
}

function isMissingColumnError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? ''
  return message.includes('does not exist') || message.includes('schema cache') || message.includes('could not find')
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function getSellingPrice(price: number, comparePrice: number | string | null) {
  if (comparePrice == null) return roundMoney(price)
  return roundMoney(Number(comparePrice))
}

function toAddressJson(address: CheckoutAddress) {
  return {
    full_name: address.fullName,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    region: address.region,
    postal_code: address.postalCode,
    country: address.country,
  }
}

function parseAddress(raw: unknown): CheckoutAddress | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const fullName =
    typeof value.fullName === 'string' ? value.fullName : typeof value.full_name === 'string' ? value.full_name : ''
  const line1 = typeof value.line1 === 'string' ? value.line1 : ''
  const city = typeof value.city === 'string' ? value.city : ''
  const region = typeof value.region === 'string' ? value.region : ''
  const postalCode =
    typeof value.postalCode === 'string' ? value.postalCode : typeof value.postal_code === 'string' ? value.postal_code : ''
  const country = typeof value.country === 'string' ? value.country : ''
  if (!fullName && !line1) return null
  return {
    fullName,
    line1,
    line2: typeof value.line2 === 'string' ? value.line2 : undefined,
    city,
    region,
    postalCode,
    country,
  }
}
