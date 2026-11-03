/** Canonical site identity used across metadata, Open Graph, and structured data. */
export const SITE_NAME = 'KREWNOX'
export const SITE_URL = 'https://krewnox.ca'

export const DEFAULT_META_DESCRIPTION =
  'Shop the KREWNOX Season 1 Fall Collection: tracksuit sets, quarter zip hoodies and sweatpants. Prices in CAD.'

/** Resolves a site-relative path (or an already-absolute URL) to an absolute `https://krewnox.ca/...` URL. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
