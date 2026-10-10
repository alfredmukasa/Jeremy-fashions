/** Authoritative checkout math. New charges use these numbers in CAD. Historical orders keep their stored currency. */

export const STORE_CURRENCY = 'CAD'
export const SHIPPING_THRESHOLD = 250
export const SHIPPING_FLAT = 12
export const TAX_RATE = 0.08

export type DiscountType = 'percentage' | 'fixed'

export type DiscountRule = {
  id: string
  code: string
  active: boolean
  expiresAt: string | null
  discountType: DiscountType
  percentage: number | null
  amount: number | null
  minSubtotal: number
  usageLimit: number | null
  usageCount: number
  productIds: string[]
  allowedEmails: string[]
}

export type PricedLine = {
  productId: string
  quantity: number
  unitPrice: number
}

export type OrderTotals = {
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  currency: string
}

export type DiscountDecision =
  | { ok: true; amount: number; eligibleSubtotal: number }
  | { ok: false; error: string }

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export type CatalogPrice = {
  selling: number
  compare: number | null
}

/**
 * Charge the lower amount when a second price is present and lower (sale).
 * When the second price is higher, treat it as compare-at and charge `price`.
 */
export function resolveCatalogPrice(price: number, compareOrSale?: number | string | null): CatalogPrice {
  const list = roundMoney(Number(price) || 0)
  if (compareOrSale == null || compareOrSale === '') {
    return { selling: list, compare: null }
  }
  const other = roundMoney(Number(compareOrSale))
  if (!Number.isFinite(other) || other <= 0 || other === list) {
    return { selling: list, compare: null }
  }
  if (other < list) return { selling: other, compare: list }
  return { selling: list, compare: other }
}

/** CA$49.99 → 4999. Never use this to convert between currencies. */
export function toMinorUnits(amount: number): number {
  return Math.round(roundMoney(amount) * 100)
}

export function normalizeDiscountCode(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase()
}

export function lineMerchandiseTotal(lines: PricedLine[]): number {
  return roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0))
}

export function calculateOrderTotals(
  lines: PricedLine[],
  discountAmount = 0,
  currency = STORE_CURRENCY,
): OrderTotals {
  const subtotal = lineMerchandiseTotal(lines)
  const discount = roundMoney(Math.min(Math.max(0, discountAmount), subtotal))
  const shipping = subtotal >= SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FLAT
  const taxable = roundMoney(Math.max(0, subtotal - discount))
  const tax = roundMoney(taxable * TAX_RATE)
  const total = roundMoney(Math.max(0, taxable + shipping + tax))

  return {
    subtotal,
    shipping,
    tax,
    discount,
    total,
    currency: currency.trim().toUpperCase() || STORE_CURRENCY,
  }
}

export function evaluateDiscount(
  rule: DiscountRule,
  lines: PricedLine[],
  email: string,
  now = new Date(),
): DiscountDecision {
  if (!rule.active) {
    return { ok: false, error: 'This code is no longer active.' }
  }

  if (rule.expiresAt) {
    const expires = new Date(rule.expiresAt)
    if (!Number.isNaN(expires.getTime()) && expires.getTime() <= now.getTime()) {
      return { ok: false, error: 'This code has expired.' }
    }
  }

  if (rule.usageLimit != null && rule.usageCount >= rule.usageLimit) {
    return { ok: false, error: 'This code has reached its usage limit.' }
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (rule.allowedEmails.length > 0 && !rule.allowedEmails.includes(normalizedEmail)) {
    return { ok: false, error: 'This code is not available for this email address.' }
  }

  const subtotal = lineMerchandiseTotal(lines)
  if (rule.minSubtotal > 0 && subtotal < rule.minSubtotal) {
    return {
      ok: false,
      error: `This code requires a minimum merchandise total of ${rule.minSubtotal.toFixed(2)} ${STORE_CURRENCY}.`,
    }
  }

  const restricted = rule.productIds.length > 0
  const eligibleLines = restricted ? lines.filter((line) => rule.productIds.includes(line.productId)) : lines
  if (restricted && eligibleLines.length === 0) {
    return { ok: false, error: 'This code does not apply to the items in your bag.' }
  }

  const eligibleSubtotal = lineMerchandiseTotal(eligibleLines)
  let amount = 0
  if (rule.discountType === 'fixed') {
    amount = roundMoney(Math.max(0, rule.amount ?? 0))
  } else {
    const percentage = rule.percentage ?? 0
    amount = roundMoney(eligibleSubtotal * (percentage / 100))
  }

  amount = roundMoney(Math.min(amount, eligibleSubtotal))
  if (amount <= 0) {
    return { ok: false, error: 'This code does not change the order total.' }
  }

  return { ok: true, amount, eligibleSubtotal }
}

export function readSizeStock(raw: unknown, size: string): number | null {
  const wanted = size.trim().toLowerCase()
  if (!wanted || !raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const key = Object.keys(raw as Record<string, unknown>).find((entry) => entry.trim().toLowerCase() === wanted)
  if (!key) return null
  const amount = Number((raw as Record<string, unknown>)[key])
  return Number.isFinite(amount) ? amount : null
}

export function canonicalSize(availableSizes: string[], requested: string): string | null {
  const wanted = requested.trim()
  if (!wanted) return null
  const match = availableSizes.find((size) => size.trim().toLowerCase() === wanted.toLowerCase())
  return match?.trim() || null
}

export function sizeSelectionError(availableSizes: string[], requested: string, productTitle: string): string | null {
  const available = availableSizes.map((size) => size.trim()).filter(Boolean)
  if (available.length === 0) {
    return requested.trim() ? `${productTitle} does not have selectable sizes.` : null
  }
  if (!requested.trim()) {
    return `Select a size for ${productTitle}.`
  }
  if (!canonicalSize(available, requested)) {
    return `${requested.trim()} is not available for ${productTitle}.`
  }
  return null
}

export type PaymentComparison = {
  matches: boolean
  expectedMinor: number
  receivedMinor: number
  orderCurrency: string
  stripeCurrency: string
  reason?: string
}

export function compareStripePayment(input: {
  orderTotal: number
  orderCurrency: string
  stripeAmount: number
  stripeAmountReceived?: number | null
  stripeCurrency: string
}): PaymentComparison {
  const orderCurrency = input.orderCurrency.trim().toUpperCase()
  const stripeCurrency = input.stripeCurrency.trim().toUpperCase()
  const expectedMinor = toMinorUnits(input.orderTotal)
  const receivedMinor =
    input.stripeAmountReceived != null && input.stripeAmountReceived > 0
      ? input.stripeAmountReceived
      : input.stripeAmount

  if (orderCurrency !== stripeCurrency) {
    return {
      matches: false,
      expectedMinor,
      receivedMinor,
      orderCurrency,
      stripeCurrency,
      reason: 'currency_mismatch',
    }
  }

  if (expectedMinor !== receivedMinor) {
    return {
      matches: false,
      expectedMinor,
      receivedMinor,
      orderCurrency,
      stripeCurrency,
      reason: 'amount_mismatch',
    }
  }

  return { matches: true, expectedMinor, receivedMinor, orderCurrency, stripeCurrency }
}

export function canReusePaymentIntent(input: {
  status: string
  amount: number
  currency: string
  expectedMinor: number
  expectedCurrency: string
  reusableStatuses: ReadonlySet<string>
}): boolean {
  return (
    input.reusableStatuses.has(input.status) &&
    input.amount === input.expectedMinor &&
    input.currency.trim().toLowerCase() === input.expectedCurrency.trim().toLowerCase()
  )
}

export function stripeLineDescription(
  items: Array<{ title: string; size?: string; quantity: number }>,
): string {
  const text = items
    .map((item) => {
      const size = item.size?.trim() ? ` · Size ${item.size.trim()}` : ''
      return `${item.title}${size} × ${item.quantity}`
    })
    .join('; ')
  return text.slice(0, 1000)
}

/** Checkout Sessions must stay on the currency we calculated. Adaptive Pricing would convert it. */
export const CHECKOUT_SESSION_PRICING = {
  adaptive_pricing: { enabled: false as const },
}
