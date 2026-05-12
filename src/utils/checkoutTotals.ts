export const CHECKOUT_SHIPPING_THRESHOLD = 250
export const CHECKOUT_SHIPPING_FLAT = 12
export const CHECKOUT_TAX_RATE = 0.08

export type CheckoutTotals = {
  subtotal: number
  shipping: number
  tax: number
  total: number
}

export function calculateCheckoutTotals(subtotal: number): CheckoutTotals {
  const shipping = subtotal >= CHECKOUT_SHIPPING_THRESHOLD ? 0 : CHECKOUT_SHIPPING_FLAT
  const tax = Math.round(subtotal * CHECKOUT_TAX_RATE * 100) / 100
  const total = Math.round((subtotal + shipping + tax) * 100) / 100

  return { subtotal, shipping, tax, total }
}
