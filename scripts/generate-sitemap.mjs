// Regenerates public/sitemap.xml from the public route table + live product catalog
// before every build. New products become discoverable without a manual edit;
// removed/disabled products drop out when Supabase is reachable.
//
// Static public pages always write, even if the product fetch fails — that keeps
// marketing/legal URLs aligned with the router. If products cannot be fetched,
// existing /product/* entries in public/sitemap.xml are preserved instead of
// wiping the catalog or failing the build.
import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  PUBLIC_SITEMAP_PAGES,
  SITE_URL,
  SITEMAP_EXCLUDED_PREFIXES,
} from '../src/constants/publicSitemapPages.mjs'

const OUTPUT_PATH = fileURLToPath(new URL('../public/sitemap.xml', import.meta.url))
const ROUTES_PATH = fileURLToPath(new URL('../src/constants/index.ts', import.meta.url))
const APP_ROUTES_PATH = fileURLToPath(new URL('../src/App.tsx', import.meta.url))

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

export function isExcludedLoc(loc) {
  return SITEMAP_EXCLUDED_PREFIXES.some((prefix) => loc === prefix || loc.startsWith(`${prefix}/`))
}

/** Returns an error message when a path must not be listed in the sitemap. */
export function sitemapLocError(loc) {
  if (typeof loc !== 'string' || loc.length === 0) return 'missing path'
  if (!loc.startsWith('/')) return 'path must start with /'
  if (loc.includes('?') || loc.includes('#') || /\s/.test(loc)) {
    return 'path must be canonical, with no query, hash, or space'
  }
  if (loc !== '/' && loc.endsWith('/')) return 'path must not have a trailing slash'
  if (loc.includes('//')) return 'path must not contain an empty segment'
  if (isExcludedLoc(loc)) return 'path is private, noindex, or a redirect'
  if (loc.startsWith('/product/')) {
    const slug = loc.slice('/product/'.length)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) return 'product path must be a single public slug'
  }
  return null
}

export function assertSitemapEntries(urls) {
  const seen = new Set()
  for (const url of urls) {
    const error = sitemapLocError(url.loc)
    if (error) throw new Error(`[generate-sitemap] ${url.loc || '(empty)'}: ${error}`)
    if (seen.has(url.loc)) throw new Error(`[generate-sitemap] duplicate path ${url.loc}`)
    seen.add(url.loc)
    const absolute = `${SITE_URL}${url.loc}`
    if (!absolute.startsWith('https://krewnox.ca/')) {
      throw new Error(`[generate-sitemap] ${absolute} is not an absolute HTTPS URL on krewnox.ca`)
    }
  }
}

/** Loads local .env without a dependency so `npm run sitemap` can fetch products. */
async function loadLocalEnv() {
  if (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) return
  try {
    const envPath = fileURLToPath(new URL('../.env', import.meta.url))
    const text = await readFile(envPath, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    // No local .env — expected on CI/Vercel where env is already injected.
  }
}

async function fetchActiveProducts() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.warn('[generate-sitemap] Supabase env vars not set — keeping existing product URLs.')
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
    console.warn('[generate-sitemap] Failed to fetch products — keeping existing product URLs.', err)
    return null
  }
}

async function readExistingProductUrls() {
  try {
    const xml = await readFile(OUTPUT_PATH, 'utf8')
    const urls = []
    const blockRe = /<url>([\s\S]*?)<\/url>/g
    let match
    while ((match = blockRe.exec(xml))) {
      const block = match[1]
      const locMatch = block.match(/<loc>([^<]+)<\/loc>/)
      if (!locMatch) continue
      let path
      try {
        path = new URL(locMatch[1]).pathname
      } catch {
        continue
      }
      if (!path.startsWith('/product/') || sitemapLocError(path)) continue
      const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]
      const changefreq = block.match(/<changefreq>([^<]+)<\/changefreq>/)?.[1] ?? 'weekly'
      const priority = block.match(/<priority>([^<]+)<\/priority>/)?.[1] ?? '0.8'
      urls.push({ loc: path, lastmod, changefreq, priority })
    }
    return urls
  } catch {
    return []
  }
}

function productUrlsFromRows(products) {
  const urls = []
  for (const product of products) {
    if (typeof product.slug !== 'string') continue
    const loc = `/product/${product.slug.trim()}`
    if (sitemapLocError(loc)) {
      console.warn(`[generate-sitemap] Skipping product that cannot be indexed: ${product.slug}`)
      continue
    }
    urls.push({
      loc,
      lastmod: isoDate(product.created_at),
      changefreq: 'weekly',
      priority: '0.8',
    })
  }
  urls.sort((a, b) => a.loc.localeCompare(b.loc))
  return urls
}

/**
 * Warns when a public path in ROUTES / App.tsx is missing from PUBLIC_SITEMAP_PAGES
 * (or the reverse). Does not fail the build — the sitemap list stays authoritative.
 */
async function warnIfRoutesDrift() {
  const listed = new Set(PUBLIC_SITEMAP_PAGES.map((page) => page.loc))

  try {
    const constantsSrc = await readFile(ROUTES_PATH, 'utf8')
    const publicKeys = ['home', 'shop', 'waitlist', 'contact', 'terms', 'privacy', 'refundPolicy', 'shipping']
    for (const key of publicKeys) {
      const match = constantsSrc.match(new RegExp(`\\b${key}:\\s*'([^']+)'`))
      if (match && !listed.has(match[1])) {
        console.warn(
          `[generate-sitemap] ROUTES.${key} (${match[1]}) is public but missing from publicSitemapPages.mjs`,
        )
      }
    }
  } catch {
    // Drift check is best-effort.
  }

  try {
    const appSrc = await readFile(APP_ROUTES_PATH, 'utf8')
    for (const page of PUBLIC_SITEMAP_PAGES) {
      if (page.loc === '/') continue
      const pathLiteral = page.loc
      const mentioned =
        appSrc.includes(`path="${pathLiteral}"`) ||
        appSrc.includes(`'${pathLiteral}'`) ||
        Object.entries({
          '/shop': 'ROUTES.shop',
          '/waitlist': 'ROUTES.waitlist',
          '/contact': 'ROUTES.contact',
          '/terms': 'ROUTES.terms',
          '/privacy': 'ROUTES.privacy',
          '/refund-policy': 'ROUTES.refundPolicy',
          '/shipping': 'ROUTES.shipping',
        }).some(([loc, token]) => loc === pathLiteral && appSrc.includes(token))
      if (!mentioned) {
        console.warn(
          `[generate-sitemap] ${pathLiteral} is in the sitemap list but was not found in App.tsx`,
        )
      }
    }
  } catch {
    // Drift check is best-effort.
  }
}

async function main() {
  await loadLocalEnv()
  await warnIfRoutesDrift()

  const products = await fetchActiveProducts()
  const productUrls =
    products === null ? await readExistingProductUrls() : productUrlsFromRows(products)

  const urls = [...PUBLIC_SITEMAP_PAGES, ...productUrls]
  assertSitemapEntries(urls)

  const xml = buildXml(urls)
  await writeFile(OUTPUT_PATH, xml, 'utf8')
  const productSource = products === null ? 'preserved' : 'live'
  console.log(
    `[generate-sitemap] Wrote ${urls.length} URLs (${PUBLIC_SITEMAP_PAGES.length} static, ${productUrls.length} products [${productSource}]) to public/sitemap.xml`,
  )
}

const isDirectRun = Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)

if (isDirectRun) {
  main().catch((err) => {
    console.error('[generate-sitemap] Refusing to leave an invalid sitemap in place.', err)
    process.exitCode = 1
  })
}
