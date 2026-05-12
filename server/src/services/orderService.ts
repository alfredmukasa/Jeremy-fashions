import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requireSupabaseAdmin, supabaseAnon } from '../lib/supabase.js'
import type { CheckoutAddress, CheckoutLineItem } from '../types.js'

const SHIPPING_THRESHOLD = 250
const SHIPPING_FLAT = 12
const TAX_RATE = 0.08

export type OrderTotals = {
  subtotal: number
  shipping: number
  tax: number
  total: number
  currency: string
}

export type ValidatedCheckout = {
  items: CheckoutLineItem[]
  totals: OrderTotals
}

export function calculateTotals(items: CheckoutLineItem[], currency = 'USD'): OrderTotals {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
  const tax = roundMoney(subtotal * TAX_RATE)
  const total = roundMoney(subtotal + shipping + tax)

  return { subtotal, shipping, tax, total, currency: currency.toUpperCase() }
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
    .select('id, stripe_payment_intent_id, payment_status, status, total_amount, currency')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (error) {
    throw new CheckoutError('Unable to look up an existing checkout session.', 500)
  }

  return data
}

export async function createPendingOrder(
  db: SupabaseClient,
  args: {
    userId: string
    email: string
    idempotencyKey: string
    items: CheckoutLineItem[]
    totals: OrderTotals
    shippingAddress: CheckoutAddress
    billingAddress: CheckoutAddress
    billingSameAsShipping: boolean
  },
) {
  const { data: order, error: orderError } = await db
    .from('orders')
    .insert({
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
        billing_same_as_shipping: args.billingSameAsShipping,
      },
    })
    .select('id, total_amount, currency')
    .single()

  if (orderError || !order) {
    if (orderError?.code === '23505') {
      throw new CheckoutError('This checkout session was already created. Refresh and try again.', 409)
    }
    throw new CheckoutError('Unable to create your order.', 500)
  }

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

  return order
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

type OrderPaymentRow = {
  id: string
  payment_status: string
  stripe_payment_intent_id: string | null
  payment_metadata: Record<string, unknown> | null
}

async function resolveOrderFromIntent(paymentIntent: Stripe.PaymentIntent): Promise<OrderPaymentRow | null> {
  const supabaseAdmin = requireSupabaseAdmin()
  const orderId = paymentIntent.metadata.order_id

  if (orderId) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, payment_status, stripe_payment_intent_id, payment_metadata')
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      throw new CheckoutError('Paid order could not be found.', 500)
    }

    if (data) return data as OrderPaymentRow
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, payment_status, stripe_payment_intent_id, payment_metadata')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .maybeSingle()

  if (error) {
    throw new CheckoutError('Paid order could not be found.', 500)
  }

  return (data as OrderPaymentRow | null) ?? null
}

function mergePaymentMetadata(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
  event: { type: string; stripe_status?: string; amount?: number; currency?: string },
) {
  const base = existing && typeof existing === 'object' ? { ...existing } : {}
  const events = Array.isArray(base.stripe_events) ? [...base.stripe_events] : []
  events.push({
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
  }
}

export async function markOrderProcessingFromIntent(paymentIntent: Stripe.PaymentIntent) {
  const existing = await resolveOrderFromIntent(paymentIntent)
  if (!existing || existing.payment_status === 'paid' || existing.payment_status === 'refunded') {
    return existing
  }

  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'processing',
      stripe_payment_intent_id: paymentIntent.id,
      payment_metadata: mergePaymentMetadata(existing.payment_metadata, {
        stripe_payment_intent_id: paymentIntent.id,
        stripe_payment_status: paymentIntent.status,
        processing_at: new Date().toISOString(),
      }, {
        type: 'payment_intent.processing',
        stripe_status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      }),
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

export async function markOrderPaidFromIntent(paymentIntent: Stripe.PaymentIntent) {
  const existing = await resolveOrderFromIntent(paymentIntent)
  if (!existing) return null

  if (existing.payment_status === 'paid') {
    return existing
  }

  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'paid',
      stripe_payment_intent_id: paymentIntent.id,
      payment_metadata: mergePaymentMetadata(existing.payment_metadata, {
        stripe_payment_intent_id: paymentIntent.id,
        stripe_payment_status: paymentIntent.status,
        stripe_amount_received: paymentIntent.amount_received,
        stripe_currency: paymentIntent.currency,
        stripe_payment_method: paymentIntent.payment_method,
        stripe_latest_charge: paymentIntent.latest_charge,
        paid_at: new Date().toISOString(),
      }, {
        type: 'payment_intent.succeeded',
        stripe_status: paymentIntent.status,
        amount: paymentIntent.amount_received,
        currency: paymentIntent.currency,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .neq('payment_status', 'paid')
    .select('id, payment_status')
    .maybeSingle()

  if (error) {
    throw new CheckoutError('Unable to mark the order as paid.', 500)
  }

  return data ?? existing
}

export async function markOrderFailedFromIntent(paymentIntent: Stripe.PaymentIntent) {
  const existing = await resolveOrderFromIntent(paymentIntent)
  if (!existing || existing.payment_status === 'paid') {
    return existing
  }

  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'failed',
      status: 'cancelled',
      stripe_payment_intent_id: paymentIntent.id,
      payment_metadata: mergePaymentMetadata(existing.payment_metadata, {
        stripe_payment_intent_id: paymentIntent.id,
        stripe_payment_status: paymentIntent.status,
        stripe_last_payment_error: paymentIntent.last_payment_error,
        failed_at: new Date().toISOString(),
      }, {
        type: 'payment_intent.payment_failed',
        stripe_status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      }),
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

export async function markOrderRefundedFromCharge(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!paymentIntentId) return null

  const supabaseAdmin = requireSupabaseAdmin()
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('orders')
    .select('id, payment_status, payment_metadata, total_amount')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (existingError || !existing) {
    return null
  }

  const refundedAmount = charge.amount_refunded
  const orderTotal = Math.round(Number(existing.total_amount) * 100)
  const paymentStatus = refundedAmount > 0 && refundedAmount < orderTotal ? 'partial_refund' : 'refunded'

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: paymentStatus,
      payment_metadata: mergePaymentMetadata(existing.payment_metadata as Record<string, unknown> | null, {
        stripe_charge_id: charge.id,
        stripe_amount_refunded: charge.amount_refunded,
        stripe_refunded: charge.refunded,
        refunded_at: new Date().toISOString(),
      }, {
        type: 'charge.refunded',
        stripe_status: charge.status,
        amount: charge.amount_refunded,
        currency: charge.currency,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select('id, payment_status')
    .maybeSingle()

  if (error) {
    throw new CheckoutError('Unable to mark the order as refunded.', 500)
  }

  return data
}

export class CheckoutError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CheckoutError'
    this.status = status
  }
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
