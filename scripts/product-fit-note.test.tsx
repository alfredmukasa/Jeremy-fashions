import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createServer, type ViteDevServer } from 'vite'

import { DEFAULT_SIZE_CHOICE_NOTE } from '../src/lib/sizeChart.ts'
import type { Product } from '../src/types/index.ts'

function startServer() {
  return createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    ssr: { external: ['react', 'react-dom', 'react-router-dom', 'react-icons', 'framer-motion', '@tanstack/react-query'] },
  })
}

function product(notes: string): Product {
  return {
    id: 'hoodie',
    name: 'Studio Hoodie',
    slug: 'studio-hoodie',
    description: 'Heavyweight fleece.',
    category: 'hoodies',
    productKind: 'apparel',
    gender: 'unisex',
    sizes: ['S', 'M'],
    colors: [],
    attributes: { fabric: 'Fleece', fit: 'Relaxed' },
    sizeChart: {
      unit: 'in',
      columns: [{ id: 'chest', label: 'Chest' }],
      rows: [
        { size: 'S', values: { chest: '36' } },
        { size: 'M', values: { chest: '38' } },
      ],
      notes,
    },
    price: 120,
    rating: 0,
    images: [],
    stock: 4,
    tags: [],
  }
}

async function renderProduct(server: ViteDevServer, notes: string) {
  const page = await server.ssrLoadModule('/src/pages/Product/ProductPage.tsx')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, null, createElement(page.ProductDetail, { product: product(notes) })),
    ),
  )
}

test('product details show the default fit note under apparel sizes', async () => {
  const server = await startServer()
  try {
    const html = await renderProduct(server, '')
    const sizeLabel = html.indexOf('Apparel size')
    const sizeButton = html.indexOf('>M<')
    const note = html.indexOf(DEFAULT_SIZE_CHOICE_NOTE)
    assert.ok(sizeLabel > -1)
    assert.ok(sizeButton > sizeLabel)
    assert.ok(note > sizeButton)
    assert.equal(html.includes('Garment measurements, not body measurements'), false)
  } finally {
    await server.close()
  }
})

test('an admin fit note replaces the default sentence under the size buttons', async () => {
  const server = await startServer()
  try {
    const html = await renderProduct(server, 'Roomy through the chest.')
    const sizeButton = html.indexOf('>M<')
    const note = html.indexOf('Roomy through the chest.')
    assert.ok(sizeButton > -1)
    assert.ok(note > sizeButton)
    assert.equal(html.includes(DEFAULT_SIZE_CHOICE_NOTE), false)
  } finally {
    await server.close()
  }
})
