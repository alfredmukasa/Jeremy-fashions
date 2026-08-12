// Regenerates public/sitemap.xml from the live product catalog before every build, so
// new products are discoverable without a manual edit and removed/disabled products drop
// out automatically. Runs as the `prebuild` npm lifecycle script (see package.json).
//
// Safe by design: any failure (missing env vars, network error, bad response) logs a
// warning and leaves the existing public/sitemap.xml file untouched rather than failing
// the build or writing an empty/broken sitemap.
import { createClient } from '@supabase/supabase-js'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SITE_URL = 'https://krewnox.ca'
const OUTPUT_PATH = fileURLToPath(new URL('../public/sitemap.xml', import.meta.url))

// Static, always-public pages. Keep in sync with the routes exposed in src/App.tsx and
// with public/robots.txt — anything auth-gated, transactional, or admin-only must never
// appear here (private routes are excluded by construction: this list is hand-picked,
// not derived from the route table).
// `lastmod` is only set where it reflects a real edit date (the legal pages' own "Last
// updated" stamps); it's omitted for pages whose content changes continuously (home,
// shop, waitlist) rather than backdated to "today" on every deploy.
const STATIC_PAGES = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/shop', changefreq: 'daily', priority: '0.9' },
  { loc: '/waitlist', changefreq: 'weekly', priority: '0.4' },
  { loc: '/terms', changefreq: 'monthly', priority: '0.3', lastmod: '2026-08-05' },
  { loc: '/privacy', changefreq: 'monthly', priority: '0.3', lastmod: '2026-08-05' },
  { loc: '/refund-policy', changefreq: 'monthly', priority: '0.3', lastmod: '2026-08-05' },
]

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&apos;'
    }
  })
}

function isoDate(value) {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}

function buildXml(urls) {
  const body = urls
    .map((url) => {
      const lastmod = url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''
      return (
        `  <url>\n` +
        `    <loc>${xmlEscape(SITE_URL + url.loc)}</loc>${lastmod}\n` +
        `    <changefreq>${url.changefreq}</changefreq>\n` +
        `    <priority>${url.priority}</priority>\n` +
        `  </url>`
      )
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

async function fetchActiveProducts() {
  // Same env var names the built client bundle uses (VITE_-prefixed) with a fallback to
  // the server API's names, since both are already configured in the Vercel project for
  // the existing frontend/payment-API build — no new secrets or config needed.
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.warn('[generate-sitemap] Supabase env vars not set — keeping existing public/sitemap.xml as-is.')
    return null
  }

  try {
    const client = createClient(url, anonKey, { auth: { persistSession: false } })
    const { data, error } = await client
      .from('products')
      .select('slug, created_at')
      .eq('status', 'active')

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.warn('[generate-sitemap] Failed to fetch products — keeping existing public/sitemap.xml as-is.', err)
    return null
  }
}

async function main() {
  const products = await fetchActiveProducts()
  if (products === null) return // fetch failed or unconfigured — don't overwrite a working sitemap

  const productUrls = products
    .filter((p) => typeof p.slug === 'string' && p.slug.trim().length > 0)
    .map((p) => ({
      loc: `/product/${p.slug}`,
      lastmod: isoDate(p.created_at),
      changefreq: 'weekly',
      priority: '0.8',
    }))

  const staticUrls = STATIC_PAGES

  const xml = buildXml([...staticUrls, ...productUrls])
  await writeFile(OUTPUT_PATH, xml, 'utf8')
  console.log(`[generate-sitemap] Wrote ${staticUrls.length + productUrls.length} URLs to public/sitemap.xml`)
}

main().catch((err) => {
  console.warn('[generate-sitemap] Unexpected error — keeping existing public/sitemap.xml as-is.', err)
})
