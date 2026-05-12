export const PAYMENT_STATUSES = [
  'unpaid',
  'processing',
  'paid',
  'failed',
  'refunded',
  'partial_refund',
] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export function normalizePaymentStatus(value: string): PaymentStatus {
  const normalized = value.toLowerCase()
  if ((PAYMENT_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as PaymentStatus
  }
  return 'unpaid'
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'unpaid':
      return 'Awaiting payment'
    case 'processing':
      return 'Processing'
    case 'paid':
      return 'Paid'
    case 'failed':
      return 'Failed'
    case 'refunded':
      return 'Refunded'
    case 'partial_refund':
      return 'Partial refund'
    default:
      return 'Awaiting payment'
  }
}

export function paymentStatusTone(status: PaymentStatus): string {
  switch (status) {
    case 'unpaid':
      return 'bg-amber-50 text-amber-900 ring-amber-200/80'
    case 'processing':
      return 'bg-sky-50 text-sky-900 ring-sky-200/80'
    case 'paid':
      return 'bg-emerald-50 text-emerald-900 ring-emerald-200/80'
    case 'failed':
      return 'bg-rose-50 text-rose-900 ring-rose-200/80'
    case 'refunded':
    case 'partial_refund':
      return 'bg-violet-50 text-violet-900 ring-violet-200/80'
    default:
      return 'bg-neutral-100 text-neutral-700 ring-neutral-200'
  }
}

export type PaymentActivityEvent = {
  type: string
  at?: string
  stripe_status?: string
  amount?: number
  currency?: string
}

export function readPaymentActivity(metadata: unknown): PaymentActivityEvent[] {
  if (!metadata || typeof metadata !== 'object') return []
  const events = (metadata as Record<string, unknown>).stripe_events
  if (!Array.isArray(events)) return []
  return events
    .filter((event): event is PaymentActivityEvent => Boolean(event) && typeof event === 'object')
    .map((event) => ({
      type: typeof event.type === 'string' ? event.type : 'event',
      at: typeof event.at === 'string' ? event.at : undefined,
      stripe_status: typeof event.stripe_status === 'string' ? event.stripe_status : undefined,
      amount: typeof event.amount === 'number' ? event.amount : undefined,
      currency: typeof event.currency === 'string' ? event.currency : undefined,
    }))
}
