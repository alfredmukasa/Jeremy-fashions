export type DetectedLocation = {
  countryCode: string
  regionName: string | null
}

/**
 * IP-based location lookup (no permission prompt, unlike the browser Geolocation API) used
 * to prefill the checkout country/region. Best-effort only — every caller must handle `null`
 * (network failure, ad blocker, or an IP GeoJS can't resolve).
 */
export async function detectLocation(): Promise<DetectedLocation | null> {
  try {
    const response = await fetch('https://get.geojs.io/v1/ip/geo.json')
    if (!response.ok) return null

    const data = (await response.json()) as Record<string, unknown>
    const countryCode = typeof data.country_code === 'string' ? data.country_code.toUpperCase() : ''
    if (!countryCode) return null

    const regionName = typeof data.region === 'string' && data.region.trim() ? data.region.trim() : null
    return { countryCode, regionName }
  } catch {
    return null
  }
}
