export const ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export function normalizeOrderStatus(value: string): OrderStatus {
  const normalized = value.toLowerCase()
  if ((ORDER_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as OrderStatus
  }
  return 'pending'
}

export function orderStatusLabel(status: OrderStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function orderStatusTone(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-900 ring-amber-200/80'
    case 'paid':
      return 'bg-emerald-50 text-emerald-900 ring-emerald-200/80'
    case 'processing':
      return 'bg-sky-50 text-sky-900 ring-sky-200/80'
    case 'shipped':
      return 'bg-indigo-50 text-indigo-900 ring-indigo-200/80'
    case 'delivered':
      return 'bg-neutral-900 text-white ring-neutral-900/20'
    case 'cancelled':
      return 'bg-rose-50 text-rose-900 ring-rose-200/80'
    default:
      return 'bg-neutral-100 text-neutral-700 ring-neutral-200'
  }
}
