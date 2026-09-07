/**
 * Single source of truth for public, indexable sitemap URLs.
 *
 * Keep this list aligned with the storefront router in src/App.tsx and the
 * string paths on ROUTES in src/constants/index.ts. The generate-sitemap
 * script imports this module — do not hand-edit public/sitemap.xml.
 *
 * Include only pages that are public AND indexable (no noindex, no auth gate).
 * Category/collection filters are query params on /shop with a /shop canonical,
 * so they must not be listed here.
 */
export const SITE_URL = 'https://krewnox.ca'

/**
 * Static marketing / legal routes that always belong in the sitemap.
 * `lastmod` is only set where it matches a real legal-page "Last updated" stamp.
 */
export const PUBLIC_SITEMAP_PAGES = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/shop', changefreq: 'daily', priority: '0.9' },
  { loc: '/waitlist', changefreq: 'weekly', priority: '0.4' },
  { loc: '/terms', changefreq: 'monthly', priority: '0.3', lastmod: '2026-08-05' },
  { loc: '/privacy', changefreq: 'monthly', priority: '0.3', lastmod: '2026-08-05' },
  { loc: '/refund-policy', changefreq: 'monthly', priority: '0.3', lastmod: '2026-08-05' },
]

/**
 * First-path segments that must never appear in the sitemap. Mirrors
 * robots.txt Disallow rules and the noindex routes in App.tsx.
 */
export const SITEMAP_EXCLUDED_PREFIXES = [
  '/cart',
  '/checkout',
  '/account',
  '/orders',
  '/profile',
  '/saved',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/admin',
  '/krewnox-admin',
]
