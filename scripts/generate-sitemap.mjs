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
import { fileURLToPath } from 'node:url'

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

function isExcludedLoc(loc) {
  return SITEMAP_EXCLUDED_PREFIXES.some((prefix) => loc === prefix || loc.startsWith(`${prefix}/`))
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
      if (!path.startsWith('/product/')) continue
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
  return products
    .filter((p) => typeof p.slug === 'string' && p.slug.trim().length > 0)
    .map((p) => ({
      loc: `/product/${p.slug}`,
      lastmod: isoDate(p.created_at),
      changefreq: 'weekly',
      priority: '0.8',
    }))
}

/**
 * Warns when a public path in ROUTES / App.tsx is missing from PUBLIC_SITEMAP_PAGES
 * (or the reverse). Does not fail the build — the sitemap list stays authoritative.
 */
async function warnIfRoutesDrift() {
  const listed = new Set(PUBLIC_SITEMAP_PAGES.map((page) => page.loc))

  try {
    const constantsSrc = await readFile(ROUTES_PATH, 'utf8')
    const publicKeys = ['home', 'shop', 'waitlist', 'terms', 'privacy', 'refundPolicy']
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
          '/terms': 'ROUTES.terms',
          '/privacy': 'ROUTES.privacy',
          '/refund-policy': 'ROUTES.refundPolicy',
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
  const leaked = urls.filter((url) => isExcludedLoc(url.loc))
  if (leaked.length > 0) {
    throw new Error(
      `[generate-sitemap] Refusing to write private/noindex URLs: ${leaked.map((u) => u.loc).join(', ')}`,
    )
  }

  const xml = buildXml(urls)
  await writeFile(OUTPUT_PATH, xml, 'utf8')
  const productSource = products === null ? 'preserved' : 'live'
  console.log(
    `[generate-sitemap] Wrote ${urls.length} URLs (${PUBLIC_SITEMAP_PAGES.length} static, ${productUrls.length} products [${productSource}]) to public/sitemap.xml`,
  )
}

main().catch((err) => {
  console.warn('[generate-sitemap] Unexpected error — keeping existing public/sitemap.xml as-is.', err)
})
