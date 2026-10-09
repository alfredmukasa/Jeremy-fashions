import { randomBytes } from 'node:crypto'

import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  STORE_CURRENCY,
  calculateOrderTotals,
  canonicalSize,
  compareStripePayment,
  roundMoney,
  sizeSelectionError,
  stripeLineDescription,
  toMinorUnits,
  type OrderTotals,
} from '../domain/checkoutPricing.js'
import { recordConfirmationEmailIfNeeded } from './confirmationEmail.js'
import { recordDiscountRedemption, resolveDiscount, type AppliedDiscount } from './discountCodes.js'
import { requireSupabaseAdmin, supabaseAnon } from '../lib/supabase.js'
import type { CheckoutAddress, CheckoutLineItem } from '../types.js'

export type { OrderTotals }
export { stripeLineDescription, toMinorUnits, STORE_CURRENCY }

export type ValidatedCheckout = {
  items: CheckoutLineItem[]
  totals: OrderTotals
  discount: AppliedDiscount | null
}

export type OrderConfirmationItem = {
  title: string
  quantity: number
  unitPrice: number
  size?: string | null
  sku?: string | null
  lineTotal?: number
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

export function calculateTotals(
  items: CheckoutLineItem[],
  currency = STORE_CURRENCY,
  discountAmount = 0,
): OrderTotals {
  return calculateOrderTotals(items, discountAmount, currency)
}

export async function validateCheckoutItems(
  items: CheckoutLineItem[],
  options?: { email?: string; discountCode?: string | null },
): Promise<ValidatedCheckout> {
  if (!items.length) {
    throw new CheckoutError('Your bag is empty.', 400)
  }

  const productIds = [...new Set(items.map((item) => item.productId))]
  const { data: products, error } = await supabaseAnon
    .from('products')
    .select('id, title, price, compare_price, status, stock_quantity, sku, sizes')
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

    const availableSizes = Array.isArray(product.sizes)
      ? product.sizes.filter((size: unknown): size is string => typeof size === 'string')
      : []
    const sizeError = sizeSelectionError(availableSizes, item.size ?? '', product.title)
    if (sizeError) {
      throw new CheckoutError(sizeError, 400)
    }

    const expectedUnitPrice = getSellingPrice(Number(product.price), product.compare_price)

    validated.push({
      productId: item.productId,
      title: product.title,
      quantity: item.quantity,
      unitPrice: expectedUnitPrice,
      size: canonicalSize(availableSizes, item.size ?? '') ?? '',
      colorName: item.colorName,
      sku: product.sku ?? item.sku,
    })
  }

  const discountResult = await resolveDiscount({
    code: options?.discountCode,
    email: options?.email ?? '',
    lines: validated,
  })
  if (discountResult.error) {
    throw new CheckoutError(discountResult.error, 400)
  }

  return {
    items: validated,
    totals: calculateTotals(validated, STORE_CURRENCY, discountResult.applied?.amount ?? 0),
    discount: discountResult.applied,
  }
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
    discount?: AppliedDiscount | null
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
      discount_code: args.discount?.code ?? null,
      discount_code_id: args.discount?.id ?? null,
      billing_same_as_shipping: args.billingSameAsShipping,
      currency: args.totals.currency,
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

  const itemsError = await insertOrderItems(db, order.id, args.items)
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
    discount?: AppliedDiscount | null
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
      discount_code: args.discount?.code ?? null,
      discount_code_id: args.discount?.id ?? null,
      billing_same_as_shipping: args.billingSameAsShipping,
      currency: args.totals.currency,
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

  const itemsError = await insertOrderItems(db, orderId, args.items)
  if (itemsError) {
    throw new CheckoutError('Unable to save order line items.', 500)
  }
}

export async function rememberCheckoutSession(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id
  if (!orderId) return

  const sessionRecord = session as Stripe.Checkout.Session & {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null
    collected_information?: { shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null } | null
  }
  const details = sessionRecord.collected_information?.shipping_details ?? sessionRecord.shipping_details
  const address = details?.address
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (address?.line1) {
    patch.shipping_address = {
      full_name: details?.name ?? session.customer_details?.name ?? '',
      line1: address.line1,
      line2: address.line2 ?? null,
      city: address.city ?? '',
      region: address.state ?? '',
      postal_code: address.postal_code ?? '',
      country: address.country ?? '',
      phone: session.customer_details?.phone ?? null,
    }
  }

  const db = requireSupabaseAdmin()
  const withSession = await db
    .from('orders')
    .update({ ...patch, stripe_checkout_session_id: session.id })
    .eq('id', orderId)
  if (withSession.error && isMissingColumnError(withSession.error)) {
    const fallback = await db.from('orders').update(patch).eq('id', orderId)
    if (fallback.error) {
      console.warn('[orders] checkout session was not saved', fallback.error.message)
    }
    return
  }
  if (withSession.error) {
    console.warn('[orders] checkout session was not saved', withSession.error.message)
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
  currency?: string | null
  stripe_payment_intent_id: string | null
  payment_metadata: Record<string, unknown> | null
  confirmation_email_sent_at?: string | null
}

const SETTLED_PAYMENT_STATUSES = new Set(['paid', 'refunded', 'partial_refund'])

function orderItemPayload(orderId: string, item: CheckoutLineItem, withSnapshot: boolean) {
  const base = {
    order_id: orderId,
    product_id: item.productId,
    title: item.title,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    sku: item.sku ?? null,
  }
  if (!withSnapshot) return base
  return {
    ...base,
    size: item.size || null,
    color_name: item.colorName || null,
    line_total: roundMoney(item.unitPrice * item.quantity),
  }
}

async function insertOrderItems(db: SupabaseClient, orderId: string, items: CheckoutLineItem[]) {
  const withSnapshot = items.map((item) => orderItemPayload(orderId, item, true))
  const primary = await db.from('order_items').insert(withSnapshot)
  if (!primary.error) return null
  if (!isMissingColumnError(primary.error)) return primary.error
  const fallback = await db.from('order_items').insert(items.map((item) => orderItemPayload(orderId, item, false)))
  return fallback.error
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

function paymentSettled(status: string | undefined) {
  return Boolean(status && SETTLED_PAYMENT_STATUSES.has(status))
}

function fulfillmentAfterPayment(current: string | undefined) {
  if (current === 'shipped' || current === 'delivered') return current
  return 'processing'
}

async function flagPaymentMismatch(existing: OrderPaymentRow, paymentIntent: Stripe.PaymentIntent, eventId?: string) {
  const comparison = compareStripePayment({
    orderTotal: Number(existing.total_amount ?? 0),
    orderCurrency: existing.currency || 'USD',
    stripeAmount: paymentIntent.amount,
    stripeAmountReceived: paymentIntent.amount_received,
    stripeCurrency: paymentIntent.currency,
  })
  if (comparison.matches) return null

  console.error('[payments] stripe amount did not match the order; leaving payment unpaid', {
    orderId: existing.id,
    reason: comparison.reason,
    expectedMinor: comparison.expectedMinor,
    receivedMinor: comparison.receivedMinor,
    orderCurrency: comparison.orderCurrency,
    stripeCurrency: comparison.stripeCurrency,
  })

  const supabaseAdmin = requireSupabaseAdmin()
  await supabaseAdmin
    .from('orders')
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      payment_metadata: mergePaymentMetadata(
        existing.payment_metadata,
        {
          payment_review_required: true,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_amount: paymentIntent.amount,
          stripe_amount_received: paymentIntent.amount_received,
          stripe_currency: paymentIntent.currency,
          expected_amount_minor: comparison.expectedMinor,
          payment_mismatch_reason: comparison.reason,
        },
        {
          id: eventId,
          type: 'payment_intent.succeeded',
          stripe_status: paymentIntent.status,
          amount: paymentIntent.amount_received || paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .not('payment_status', 'in', '("paid","refunded","partial_refund")')

  return comparison
}

export async function markOrderProcessingFromIntent(paymentIntent: Stripe.PaymentIntent, eventId?: string) {
  const existing = await resolveOrderFromIntent(paymentIntent)
  if (!existing || paymentSettled(existing.payment_status)) {
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

  if (paymentSettled(existing.payment_status)) {
    return existing
  }
  if (alreadyProcessedEvent(existing, eventId) && existing.payment_status === 'paid') {
    return existing
  }

  const mismatch = await flagPaymentMismatch(existing, paymentIntent, eventId)
  if (mismatch) return existing

  const supabaseAdmin = requireSupabaseAdmin()
  const paidMetadata = mergePaymentMetadata(
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
      discount_usage_recorded: existing.payment_metadata?.discount_usage_recorded === true,
    },
    {
      id: eventId,
      type: 'payment_intent.succeeded',
      stripe_status: paymentIntent.status,
      amount: paymentIntent.amount_received,
      currency: paymentIntent.currency,
    },
  )
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'paid',
      status: fulfillmentAfterPayment(existing.status),
      stripe_payment_intent_id: paymentIntent.id,
      payment_metadata: paidMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .not('payment_status', 'in', '("paid","refunded","partial_refund")')
    .select('id, payment_status, email, order_number, confirmation_email_sent_at')
    .maybeSingle()

  let paidRow = data
  let paidError = error
  if (paidError && isMissingColumnError(paidError)) {
    const fallback = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        status: fulfillmentAfterPayment(existing.status),
        stripe_payment_intent_id: paymentIntent.id,
        payment_metadata: paidMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .not('payment_status', 'in', '("paid","refunded","partial_refund")')
      .select('id, payment_status, email')
      .maybeSingle()
    paidRow = fallback.data as typeof data
    paidError = fallback.error
  }

  if (paidError) {
    throw new CheckoutError('Unable to mark the order as paid.', 500)
  }

  if (paidRow && existing.payment_metadata?.stock_decremented !== true) {
    await decrementStockForOrder(existing.id)
  }

  const discountCodeId = existing.payment_metadata?.discount_code_id
  if (paidRow && typeof discountCodeId === 'string' && existing.payment_metadata?.discount_usage_recorded !== true) {
    await recordDiscountRedemption(discountCodeId)
    await supabaseAdmin
      .from('orders')
      .update({
        payment_metadata: { ...paidMetadata, discount_usage_recorded: true },
      })
      .eq('id', existing.id)
  }

  if (paidRow) {
    await recordConfirmationEmailIfNeeded(
      {
        id: existing.id,
        email: String((paidRow as { email?: string }).email ?? existing.email ?? ''),
        orderNumber: String(
          (paidRow as { order_number?: string | null }).order_number ??
            existing.order_number ??
            existing.id.slice(0, 8).toUpperCase(),
        ),
        confirmationEmailSentAt:
          (paidRow as { confirmation_email_sent_at?: string | null }).confirmation_email_sent_at ??
          existing.confirmation_email_sent_at ??
          null,
      },
      paymentIntent,
    )
  }

  return paidRow ?? existing
}

export async function markOrderFailedFromIntent(paymentIntent: Stripe.PaymentIntent, eventId?: string) {
  const existing = await resolveOrderFromIntent(paymentIntent)
  if (!existing || paymentSettled(existing.payment_status)) {
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
    .not('payment_status', 'in', '("paid","refunded","partial_refund")')
    .select('id, payment_status')
    .maybeSingle()

  if (error) {
    throw new CheckoutError('Unable to mark the order as failed.', 500)
  }

  return data
}

export async function markOrderCancelledFromIntent(paymentIntent: Stripe.PaymentIntent, eventId?: string) {
  const existing = await resolveOrderFromIntent(paymentIntent)
  if (!existing || paymentSettled(existing.payment_status)) {
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
    .not('payment_status', 'in', '("paid","refunded","partial_refund")')
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
    order_items ( title, quantity, unit_price, size, sku, line_total, product_id )
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
    size: item.size ?? null,
    sku: item.sku ?? null,
    lineTotal: item.line_total == null ? roundMoney(Number(item.unit_price) * item.quantity) : Number(item.line_total),
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
  order_items: Array<{
    title: string
    quantity: number
    unit_price: number | string
    size?: string | null
    sku?: string | null
    line_total?: number | string | null
  }> | null
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
    'id, email, order_number, payment_status, status, total_amount, currency, stripe_payment_intent_id, payment_metadata, confirmation_email_sent_at'
  const fallbackSelect = 'id, email, payment_status, status, total_amount, currency, stripe_payment_intent_id, payment_metadata'

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
