/** Canonical site identity used across metadata, Open Graph, and structured data. */
export const SITE_NAME = 'KREWNOX'
export const SITE_URL = 'https://krewnox.ca'

export const DEFAULT_META_DESCRIPTION =
  'KREWNOX is a modern fashion studio for tailored outerwear, sculptural sneakers, and studio-grade essentials — designed as a system, not a statement.'

/** Resolves a site-relative path (or an already-absolute URL) to an absolute `https://krewnox.ca/...` URL. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
