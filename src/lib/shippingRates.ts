/**
 * Display-side copy of the server shipping rule.
 * The payment server recalculates the fee from site_settings and ignores any price the browser sends.
 * Defaults match the server: CA$12.00, complimentary at CA$250.00, until an admin saves a rate.
 */

export const SHIPPING_RATES_KEY = 'shipping_rates'

export const DEFAULT_SHIPPING_FLAT = 12
export const DEFAULT_SHIPPING_FREE_THRESHOLD = 250

export type ShippingRates = {
  flatRate: number
  freeThreshold: number | null
}

export const DEFAULT_SHIPPING_RATES: ShippingRates = {
  flatRate: DEFAULT_SHIPPING_FLAT,
  freeThreshold: DEFAULT_SHIPPING_FREE_THRESHOLD,
}

const MAX_FLAT = 100_000
const MAX_THRESHOLD = 1_000_000

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function readNonNegativeMoney(value: unknown, max: number): number | null {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : Number.NaN
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > max) return null
  return roundMoney(numeric)
}

export function parseShippingRates(value: unknown): ShippingRates {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_SHIPPING_RATES }
  }

  const raw = value as Record<string, unknown>
  const flatRate = readNonNegativeMoney(raw.flatRate, MAX_FLAT)
  if (flatRate == null) return { ...DEFAULT_SHIPPING_RATES }

  if (!Object.prototype.hasOwnProperty.call(raw, 'freeThreshold') || raw.freeThreshold == null) {
    if (raw.freeThreshold === null) return { flatRate, freeThreshold: null }
    return { flatRate, freeThreshold: DEFAULT_SHIPPING_FREE_THRESHOLD }
  }

  const freeThreshold = readNonNegativeMoney(raw.freeThreshold, MAX_THRESHOLD)
  if (freeThreshold == null) return { flatRate, freeThreshold: DEFAULT_SHIPPING_FREE_THRESHOLD }
  return { flatRate, freeThreshold }
}

export function shippingForMerchandise(subtotal: number, rates: ShippingRates = DEFAULT_SHIPPING_RATES): number {
  const merchandise = roundMoney(Math.max(0, subtotal))
  if (merchandise === 0) return 0
  if (rates.freeThreshold != null && merchandise >= rates.freeThreshold) return 0
  return roundMoney(Math.max(0, rates.flatRate))
}

export type ShippingFormState = {
  flatRate: string
  offerFreeShipping: boolean
  freeThreshold: string
}

function moneyInput(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export function shippingFormFromStored(value: unknown): ShippingFormState {
  const rates = parseShippingRates(value)
  return {
    flatRate: moneyInput(rates.flatRate),
    offerFreeShipping: rates.freeThreshold != null,
    freeThreshold: moneyInput(rates.freeThreshold ?? DEFAULT_SHIPPING_FREE_THRESHOLD),
  }
}

export function shippingRatesFromForm(input: ShippingFormState):
  | { ok: true; value: ShippingRates & { currency: 'CAD' } }
  | { ok: false; error: string } {
  const flatRate = Number(input.flatRate)
  if (!input.flatRate.trim() || !Number.isFinite(flatRate) || flatRate < 0) {
    return { ok: false, error: 'Enter a flat shipping rate of zero or more.' }
  }
  if (flatRate > MAX_FLAT) return { ok: false, error: 'Flat shipping rate is too large.' }

  let freeThreshold: number | null = null
  if (input.offerFreeShipping) {
    const threshold = Number(input.freeThreshold)
    if (!input.freeThreshold.trim() || !Number.isFinite(threshold) || threshold < 0) {
      return {
        ok: false,
        error: 'Enter a free-shipping threshold of zero or more, or turn complimentary shipping off.',
      }
    }
    if (threshold > MAX_THRESHOLD) return { ok: false, error: 'Free-shipping threshold is too large.' }
    freeThreshold = roundMoney(threshold)
  }

  return {
    ok: true,
    value: { flatRate: roundMoney(flatRate), freeThreshold, currency: 'CAD' },
  }
}

export function shippingRateNote(rates: ShippingRates): string {
  const flat = `CA$${rates.flatRate.toFixed(2)}`
  if (rates.flatRate === 0 || rates.freeThreshold === 0) return 'Shipping is complimentary.'
  if (rates.freeThreshold == null) return `Shipping is a flat ${flat}.`
  const threshold = `CA$${rates.freeThreshold.toFixed(2)}`
  return `Shipping is ${flat}, or complimentary when merchandise is ${threshold} or more.`
}
