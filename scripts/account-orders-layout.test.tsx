import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer, type ViteDevServer } from 'vite'

type OrderFixture = {
  id: string
  orderNumber: string
  createdAt: string
  status: string
  paymentStatus: 'paid' | 'unpaid' | 'failed'
}

function order(partial: OrderFixture) {
  return {
    ...partial,
    totalAmount: 120,
    refundAmount: 0,
    currency: 'CAD',
    shippingAddress: null,
    paymentMethod: 'card',
    stripePaymentIntentId: null,
    paidAt: partial.paymentStatus === 'paid' ? partial.createdAt : null,
    items: [
      {
        id: `${partial.id}-item`,
        productId: null,
        title: 'Studio coat',
        quantity: 1,
        unitPrice: 120,
        sku: null,
        size: 'M',
        colorName: 'Black',
        imageUrl: null,
      },
    ],
  }
}

async function renderPanel(
  server: ViteDevServer,
  props: {
    awaitingPayment: ReturnType<typeof order>[]
    purchaseHistory: ReturnType<typeof order>[]
    isLoading?: boolean
    isError?: boolean
  },
) {
  const panel = await server.ssrLoadModule('/src/components/account/dashboard/AccountOrdersPanel.tsx')
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(panel.AccountOrdersPanel, {
        awaitingPayment: props.awaitingPayment,
        purchaseHistory: props.purchaseHistory,
        isLoading: props.isLoading ?? false,
        isError: props.isError ?? false,
      }),
    ),
  )
}

function startServer() {
  return createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    ssr: { external: ['react', 'react-dom', 'react-router-dom', 'react-icons'] },
  })
}

test('purchase history renders above awaiting payment, and both sections stay visible', async () => {
  const server = await startServer()
  try {
    const html = await renderPanel(server, {
      purchaseHistory: [
        order({
          id: 'paid-new',
          orderNumber: 'KN-PAID-NEW',
          createdAt: '2026-04-02T00:00:00.000Z',
          status: 'processing',
          paymentStatus: 'paid',
        }),
        order({
          id: 'paid-old',
          orderNumber: 'KN-PAID-OLD',
          createdAt: '2026-01-02T00:00:00.000Z',
          status: 'delivered',
          paymentStatus: 'paid',
        }),
      ],
      awaitingPayment: [
        order({
          id: 'pend-new',
          orderNumber: 'KN-PEND-NEW',
          createdAt: '2026-05-02T00:00:00.000Z',
          status: 'pending',
          paymentStatus: 'unpaid',
        }),
        order({
          id: 'pend-old',
          orderNumber: 'KN-PEND-OLD',
          createdAt: '2026-03-02T00:00:00.000Z',
          status: 'pending',
          paymentStatus: 'failed',
        }),
      ],
    })

    const purchaseAt = html.indexOf('Purchase history')
    const awaitingAt = html.indexOf('Awaiting payment')
    assert.ok(purchaseAt >= 0, 'purchase history heading is visible')
    assert.ok(awaitingAt >= 0, 'awaiting payment heading is visible')
    assert.ok(purchaseAt < awaitingAt, 'paid purchase history is above awaiting payment')

    const paidNew = html.indexOf('KN-PAID-NEW')
    const paidOld = html.indexOf('KN-PAID-OLD')
    const pendNew = html.indexOf('KN-PEND-NEW')
    const pendOld = html.indexOf('KN-PEND-OLD')
    assert.ok(paidNew >= 0 && paidOld > paidNew, 'newest paid order stays first inside purchase history')
    assert.ok(pendNew >= 0 && pendOld > pendNew, 'newest unpaid order stays first inside awaiting payment')
    assert.ok(paidOld < pendNew, 'every paid row stays above the pending section')
  } finally {
    await server.close()
  }
})

test('empty purchase history and empty awaiting payment both remain on the orders page', async () => {
  const server = await startServer()
  try {
    const html = await renderPanel(server, { purchaseHistory: [], awaitingPayment: [] })
    const purchaseAt = html.indexOf('Purchase history')
    const awaitingAt = html.indexOf('Awaiting payment')
    assert.ok(purchaseAt >= 0 && awaitingAt > purchaseAt)
    assert.match(html, /No paid purchases yet/)
    assert.match(html, /You have no orders waiting for payment/)
  } finally {
    await server.close()
  }
})
