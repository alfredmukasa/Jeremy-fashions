import { normalizeOrderStatus } from './orderStatus'
import { normalizePaymentStatus } from './paymentStatus'

/** Admin order categories. These read existing payment and fulfillment statuses. */
export const ADMIN_ORDER_QUEUES = [
  'paid',
  'completed',
  'history',
  'refunded',
  'failed',
  'canceled',
  'awaiting_payment',
] as const

export type AdminOrderQueue = (typeof ADMIN_ORDER_QUEUES)[number]

export type OrderSort = 'newest' | 'oldest'

export const DEFAULT_ADMIN_ORDER_QUEUE: AdminOrderQueue = 'paid'
export const DEFAULT_ORDER_SORT: OrderSort = 'newest'

const COMPLETED_FULFILLMENT = new Set(['shipped', 'delivered'])

export function isCompletedFulfillment(status: string): boolean {
  return COMPLETED_FULFILLMENT.has(normalizeOrderStatus(status))
}

export function orderInQueue(status: string, paymentStatus: string, queue: AdminOrderQueue): boolean {
  const fulfillment = normalizeOrderStatus(status)
  const payment = normalizePaymentStatus(paymentStatus)
  const completed = COMPLETED_FULFILLMENT.has(fulfillment)
  const paid = payment === 'paid'

  switch (queue) {
    case 'paid':
      return paid && !completed && fulfillment !== 'cancelled'
    case 'completed':
      return completed
    case 'history':
      return paid || completed
    case 'refunded':
      return payment === 'refunded' || payment === 'partial_refund'
    case 'failed':
      return payment === 'failed'
    case 'canceled':
      return fulfillment === 'cancelled'
    case 'awaiting_payment':
      return (payment === 'unpaid' || payment === 'processing') && !completed && fulfillment !== 'cancelled'
    default:
      return false
  }
}

/**
 * Orders the customer still needs to pay. Canceled checkouts are not bills.
 * A shipped row with no successful payment stays here so it is not hidden in history.
 */
export function customerAwaitingPayment(status: string, paymentStatus: string): boolean {
  const fulfillment = normalizeOrderStatus(status)
  const payment = normalizePaymentStatus(paymentStatus)
  if (fulfillment === 'cancelled') return false
  return payment === 'unpaid' || payment === 'processing' || payment === 'failed'
}

export function orderRecencyMs(
  order: { createdAt: string; updatedAt?: string | null },
  queue: AdminOrderQueue,
): number {
  const raw = queue === 'completed' && order.updatedAt ? order.updatedAt : order.createdAt
  const time = Date.parse(raw)
  return Number.isFinite(time) ? time : 0
}

export function sortOrganizedOrders<T extends { createdAt: string; updatedAt?: string | null }>(
  orders: T[],
  queue: AdminOrderQueue,
  sort: OrderSort,
): T[] {
  const direction = sort === 'oldest' ? 1 : -1
  return [...orders].sort(
    (a, b) => (orderRecencyMs(a, queue) - orderRecencyMs(b, queue)) * direction || a.createdAt.localeCompare(b.createdAt) * direction,
  )
}

export function canMarkOrderShipped(status: string, paymentStatus: string): boolean {
  return orderInQueue(status, paymentStatus, 'paid')
}

/** Fulfillment value `paid` is not a Stripe payment. Hide it when payment has not succeeded. */
export function showCustomerFulfillmentBadge(status: string, paymentStatus: string): boolean {
  return !(normalizeOrderStatus(status) === 'paid' && normalizePaymentStatus(paymentStatus) !== 'paid')
}
