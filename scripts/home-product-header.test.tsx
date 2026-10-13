import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

import {
  DEFAULT_HOME_PRODUCT_CTA_LABEL,
  DEFAULT_HOME_PRODUCT_TITLE,
} from '../src/constants/siteContent.ts'

function startServer() {
  return createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    ssr: { external: ['react', 'react-dom', 'react-router-dom', 'react-icons', 'framer-motion'] },
  })
}

async function renderHeader(
  server: ViteDevServer,
  title: string,
  ctaLabel: string,
) {
  const showcase = await server.ssrLoadModule('/src/components/home/ProductShowcase.tsx')
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(showcase.ProductShowcase, {
        title,
        products: [],
        cta: { label: ctaLabel, to: '/shop' },
      }),
    ),
  )
}

test('homepage product header renders saved copy as plain text', async () => {
  const server = await startServer()
  try {
    const content = await server.ssrLoadModule('/src/constants/siteContent.ts')
    const service = await server.ssrLoadModule('/src/services/siteContentService.ts')
    const header = content.resolveHomeProductHeader({
      title: 'Atelier <drop>',
      ctaLabel: 'Enter <all>',
    })

    assert.equal(header.title, 'Atelier <drop>')
    assert.equal(header.ctaLabel, 'Enter <all>')
    assert.deepEqual(service.homeProductHeaderPayload(header), {
      title: 'Atelier <drop>',
      ctaLabel: 'Enter <all>',
    })

    const html = await renderHeader(server, header.title, header.ctaLabel)
    assert.match(html, /<h2[\s>]/)
    assert.match(html, /Atelier &lt;drop&gt;/)
    assert.match(html, /Enter &lt;all&gt;/)
    assert.match(html, /href="\/shop"/)
    assert.equal(html.includes('<drop>'), false)
    assert.equal(html.includes('<all>'), false)
    assert.equal(html.includes('<script'), false)
  } finally {
    await server.close()
  }
})

test('missing or blank product header falls back to the built-in copy', async () => {
  const server = await startServer()
  try {
    const content = await server.ssrLoadModule('/src/constants/siteContent.ts')
    const service = await server.ssrLoadModule('/src/services/siteContentService.ts')

    for (const raw of [null, undefined, {}, { title: '   ', ctaLabel: '' }]) {
      const header = content.resolveHomeProductHeader(raw)
      assert.equal(header.title, DEFAULT_HOME_PRODUCT_TITLE)
      assert.equal(header.ctaLabel, DEFAULT_HOME_PRODUCT_CTA_LABEL)
    }

    const titleOnly = content.resolveHomeProductHeader({ title: 'New arrivals' })
    assert.equal(titleOnly.title, 'New arrivals')
    assert.equal(titleOnly.ctaLabel, DEFAULT_HOME_PRODUCT_CTA_LABEL)

    const payload = service.homeProductHeaderPayload({ title: '  ', ctaLabel: '' })
    assert.deepEqual(payload, {})

    const html = await renderHeader(server, DEFAULT_HOME_PRODUCT_TITLE, DEFAULT_HOME_PRODUCT_CTA_LABEL)
    assert.match(html, /The great restock/)
    assert.match(html, /View all/)
  } finally {
    await server.close()
  }
})
