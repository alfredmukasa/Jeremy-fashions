import {
  DEFAULT_SHIPPING_RATES,
  SHIPPING_RATES_KEY,
  parseShippingRates,
  type ShippingRates,
} from '../domain/shippingRates.js'
import { isD1Configured, queryD1 } from '../lib/d1.js'

/**
 * Reads the admin shipping setting with the service role.
 * Customers cannot write this row. If it is missing or unreadable, checkout
 * keeps the documented default (CA$12, complimentary at CA$250).
 */
export async function loadShippingRates(): Promise<ShippingRates> {
  if (!isD1Configured()) return { ...DEFAULT_SHIPPING_RATES }

  try {
    const rows = await queryD1<{ value: string }>('SELECT value FROM site_settings WHERE key = ? LIMIT 1', [SHIPPING_RATES_KEY])
    if (!rows[0]) return { ...DEFAULT_SHIPPING_RATES }
    return parseShippingRates(rows[0].value)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error('[shipping] unable to read admin shipping rates; using defaults', message)
    return { ...DEFAULT_SHIPPING_RATES }
  }
}
