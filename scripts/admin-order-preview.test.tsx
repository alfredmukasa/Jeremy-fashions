import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, type ViteDevServer } from 'vite'

import type { AdminOrderItem } from '../src/services/adminService.ts'

function item(partial: Pick<AdminOrderItem, 'id' | 'title'> & Partial<AdminOrderItem>): AdminOrderItem {
  return {
    product_id: null,
    quantity: 1,
    unit_price: 10,
    sku: null,
    size: 'M',
    color_name: 'Black',
    line_total: 10,
    ...partial,
  }
}

function startServer() {
  return createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    ssr: { external: ['react', 'react-dom', 'react-router-dom', 'react-icons'] },
  })
}

async function renderPreview(server: ViteDevServer, items: AdminOrderItem[]) {
  const page = await server.ssrLoadModule('/src/pages/Admin/AdminOrdersPage.tsx')
  return renderToStaticMarkup(createElement(page.OrderPreview, { items }))
}

test('the order row lists every product instead of a one-item teaser', async () => {
  const server = await startServer()
  try {
    const html = await renderPreview(server, [
      item({ id: 'a', title: 'Krewnox quarter zip hoodie', quantity: 4, size: 'S', color_name: 'Default' }),
      item({ id: 'b', title: 'Krewnox sweatpants', quantity: 1, size: 'M', color_name: 'Default' }),
      item({ id: 'c', title: 'Krewnox tracksuit set', quantity: 1, size: 'L', color_name: 'Navy' }),
    ])
    assert.match(html, /data-line-count="3"/)
    assert.match(html, /Krewnox quarter zip hoodie/)
    assert.match(html, /Krewnox sweatpants/)
    assert.match(html, /Krewnox tracksuit set/)
    assert.doesNotMatch(html, /\+\d+ more/)
    const hoodie = html.indexOf('Krewnox quarter zip hoodie')
    const pants = html.indexOf('Krewnox sweatpants')
    const set = html.indexOf('Krewnox tracksuit set')
    assert.ok(hoodie >= 0 && pants > hoodie && set > pants)
  } finally {
    await server.close()
  }
})
