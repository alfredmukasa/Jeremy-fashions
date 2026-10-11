import {
  DEFAULT_SHIPPING_FLAT,
  DEFAULT_SHIPPING_FREE_THRESHOLD,
  DEFAULT_SHIPPING_RATES,
  shippingForMerchandise,
  type ShippingRates,
} from '../lib/shippingRates'

export const CHECKOUT_SHIPPING_THRESHOLD = DEFAULT_SHIPPING_FREE_THRESHOLD
export const CHECKOUT_SHIPPING_FLAT = DEFAULT_SHIPPING_FLAT
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

/** Preview only. The payment server recalculates the same formula from admin settings before charging. */
export function calculateCheckoutTotals(
  subtotal: number,
  discountAmount = 0,
  shippingRates: ShippingRates = DEFAULT_SHIPPING_RATES,
): CheckoutTotals {
  const discount = roundMoney(Math.min(Math.max(0, discountAmount), subtotal))
  const shipping = shippingForMerchandise(subtotal, shippingRates)
  const taxable = roundMoney(Math.max(0, subtotal - discount))
  const tax = roundMoney(taxable * CHECKOUT_TAX_RATE)
  const total = roundMoney(Math.max(0, taxable + shipping + tax))

  return { subtotal, shipping, tax, discount, total }
}
