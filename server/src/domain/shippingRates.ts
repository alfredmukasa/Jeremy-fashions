/**
 * Admin shipping rates. Catalog prices are already CAD, so these numbers are
 * CAD dollars — never convert them from another currency.
 *
 * Until an admin saves `shipping_rates` in site_settings, checkout uses
 * CA$12.00, complimentary when merchandise is at least CA$250.00.
 */

export const SHIPPING_RATES_KEY = 'shipping_rates'

export const DEFAULT_SHIPPING_FLAT = 12
export const DEFAULT_SHIPPING_FREE_THRESHOLD = 250

export type ShippingRates = {
  /** Charged once per order when the free-shipping rule does not apply. */
  flatRate: number
  /** Merchandise subtotal (before discount) at or above which shipping is 0. Null always charges the flat rate. */
  freeThreshold: number | null
}

export const DEFAULT_SHIPPING_RATES: ShippingRates = {
  flatRate: DEFAULT_SHIPPING_FLAT,
  freeThreshold: DEFAULT_SHIPPING_FREE_THRESHOLD,
}

const MAX_FLAT = 100_000
const MAX_THRESHOLD = 1_000_000

export function roundShippingMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function readNonNegativeMoney(value: unknown, max: number): number | null {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : Number.NaN
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > max) return null
  return roundShippingMoney(numeric)
}

/**
 * D1 stores site_settings.value as TEXT (JSON.stringify). The Cloudflare query
 * API returns that string, so checkout must decode it before reading flatRate.
 */
function asRateObject(value: unknown): Record<string, unknown> | null {
  let parsed: unknown = value
  if (typeof parsed === 'string') {
    const trimmed = parsed.trim()
    if (!trimmed.startsWith('{')) return null
    try {
      parsed = JSON.parse(trimmed) as unknown
    } catch {
      return null
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  return parsed as Record<string, unknown>
}

/** Invalid or missing admin JSON falls back to the documented default. A stored currency label is ignored. */
export function parseShippingRates(value: unknown): ShippingRates {
  const raw = asRateObject(value)
  if (!raw) {
    return { ...DEFAULT_SHIPPING_RATES }
  }
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

/** One shipping fee for the merchandise subtotal. Discount does not change this subtotal. */
export function shippingForMerchandise(subtotal: number, rates: ShippingRates = DEFAULT_SHIPPING_RATES): number {
  const merchandise = roundShippingMoney(Math.max(0, subtotal))
  if (merchandise === 0) return 0
  if (rates.freeThreshold != null && merchandise >= rates.freeThreshold) return 0
  return roundShippingMoney(Math.max(0, rates.flatRate))
}
