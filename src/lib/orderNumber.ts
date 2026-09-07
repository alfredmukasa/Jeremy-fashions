export function formatOrderNumber(order: { orderNumber?: string | null; id: string }) {
  if (order.orderNumber?.trim()) return order.orderNumber.trim()
  return `KN-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}
