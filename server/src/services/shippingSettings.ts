import {
  DEFAULT_SHIPPING_RATES,
  SHIPPING_RATES_KEY,
  parseShippingRates,
  type ShippingRates,
} from '../domain/shippingRates.js'
import { supabaseAdmin } from '../lib/supabase.js'

/**
 * Reads the admin shipping setting with the service role.
 * Customers cannot write this row. If it is missing or unreadable, checkout
 * keeps the documented default (CA$12, complimentary at CA$250).
 */
export async function loadShippingRates(): Promise<ShippingRates> {
  if (!supabaseAdmin) return { ...DEFAULT_SHIPPING_RATES }

  try {
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', SHIPPING_RATES_KEY)
      .maybeSingle()

    if (error || !data) return { ...DEFAULT_SHIPPING_RATES }
    return parseShippingRates(data.value)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error('[shipping] unable to read admin shipping rates; using defaults', message)
    return { ...DEFAULT_SHIPPING_RATES }
  }
}
