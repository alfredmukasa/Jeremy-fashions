import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { PUBLIC_SITEMAP_PAGES, SITE_URL } from '../src/constants/publicSitemapPages.mjs'
import { sitemapLocError } from './generate-sitemap.mjs'

const sitemapPath = fileURLToPath(new URL('../public/sitemap.xml', import.meta.url))
const robotsPath = fileURLToPath(new URL('../public/robots.txt', import.meta.url))
const vercelPath = fileURLToPath(new URL('../vercel.json', import.meta.url))

function parseLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
}

test('sitemap rules reject private, filtered, and malformed paths', () => {
  assert.equal(sitemapLocError('/shop'), null)
  assert.equal(sitemapLocError('/product/full-set'), null)
  assert.match(sitemapLocError('/shop?tag=new') ?? '', /query/)
  assert.match(sitemapLocError('/cart') ?? '', /private/)
  assert.match(sitemapLocError('/login') ?? '', /private/)
  assert.match(sitemapLocError('/krewnox-admin') ?? '', /private/)
  assert.match(sitemapLocError('/product/Not_A_Slug') ?? '', /slug/)
  assert.match(sitemapLocError('/product/missing/extra') ?? '', /slug/)
})

test('public/sitemap.xml lists only canonical HTTPS pages', async () => {
  const xml = await readFile(sitemapPath, 'utf8')
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/)
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/)
  assert.equal(xml.includes('<html'), false)
  assert.equal((xml.match(/<url>/g) ?? []).length, (xml.match(/<\/url>/g) ?? []).length)

  const locs = parseLocs(xml)
  assert.ok(locs.length >= PUBLIC_SITEMAP_PAGES.length)
  assert.deepEqual(
    locs.slice(0, PUBLIC_SITEMAP_PAGES.length),
    PUBLIC_SITEMAP_PAGES.map((page) => `${SITE_URL}${page.loc}`),
  )

  const extras = locs.slice(PUBLIC_SITEMAP_PAGES.length)
  for (const loc of locs) {
    assert.match(loc, /^https:\/\/krewnox\.ca\//)
    assert.equal(loc.includes('?'), false)
    assert.equal(loc.includes('#'), false)
    const path = new URL(loc).pathname
    assert.equal(sitemapLocError(path), null)
  }
  for (const loc of extras) {
    assert.match(new URL(loc).pathname, /^\/product\/[a-z0-9]+(?:-[a-z0-9]+)*$/i)
  }
  assert.equal(new Set(locs).size, locs.length)
})

test('robots.txt publishes the sitemap and does not block it', async () => {
  const robots = await readFile(robotsPath, 'utf8')
  assert.match(robots, /^Sitemap: https:\/\/krewnox\.ca\/sitemap\.xml$/m)
  assert.equal(/disallow:\s*\/sitemap\.xml/i.test(robots), false)
  assert.equal(/disallow:\s*\/\s*$/im.test(robots), false)
})

test('hosting does not rewrite the sitemap to the HTML app', async () => {
  const vercel = JSON.parse(await readFile(vercelPath, 'utf8'))
  const rewrites = vercel.rewrites ?? []
  for (const rewrite of rewrites) {
    if (rewrite.destination === '/index.html' || String(rewrite.destination).includes('social-preview-path')) {
      assert.match(rewrite.source, /sitemap\\.xml/)
      assert.match(rewrite.source, /robots\\.txt/)
    }
  }
  const sitemapHeaders = (vercel.headers ?? []).find((entry) => entry.source === '/sitemap.xml')
  assert.ok(sitemapHeaders)
  assert.ok(
    sitemapHeaders.headers.some(
      (header) => header.key === 'Content-Type' && header.value.startsWith('application/xml'),
    ),
  )
})
