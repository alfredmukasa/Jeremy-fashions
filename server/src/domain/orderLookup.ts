export type OrderStatusLookup = {
  column: 'id' | 'stripe_payment_intent_id'
  value: string
}

/**
 * Status lookups accept the order id. A Stripe return can also arrive with only
 * the PaymentIntent id (`pi_...`), which is not an orders.id value.
 */
export function orderStatusLookup(rawId: string): OrderStatusLookup | null {
  const value = rawId.trim()
  if (!value) return null
  if (value.startsWith('pi_')) {
    return { column: 'stripe_payment_intent_id', value }
  }
  return { column: 'id', value }
}
