export const CHECKOUT_SHIPPING_THRESHOLD = 250
export const CHECKOUT_SHIPPING_FLAT = 12
export const CHECKOUT_TAX_RATE = 0.08

export type CheckoutTotals = {
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Preview only. The payment server recalculates the same formula before charging. */
export function calculateCheckoutTotals(subtotal: number, discountAmount = 0): CheckoutTotals {
  const discount = roundMoney(Math.min(Math.max(0, discountAmount), subtotal))
  const shipping = subtotal >= CHECKOUT_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : CHECKOUT_SHIPPING_FLAT
  const taxable = roundMoney(Math.max(0, subtotal - discount))
  const tax = roundMoney(taxable * CHECKOUT_TAX_RATE)
  const total = roundMoney(Math.max(0, taxable + shipping + tax))

  return { subtotal, shipping, tax, discount, total }
}
