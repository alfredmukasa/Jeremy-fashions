import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationText,
  currencyCode,
  deliverReceiptEmail,
  shouldSendReceipt,
} from '../src/services/confirmationEmail.ts'

const receipt = {
  orderNumber: 'KN-261011-ABC123',
  email: 'buyer@example.com',
  items: [
    {
      title: 'Night Hoodie',
      size: 'M',
      color: 'Black',
      quantity: 2,
      unitPrice: 80,
      lineTotal: 160,
    },
  ],
  subtotal: 160,
  discount: 10,
  shipping: 12,
  tax: 8.5,
  total: 170.5,
  currency: 'CAD',
  shippingAddress: 'Ada Lovelace\n1 King St\nToronto ON M5V 1A1\nCanada',
}

test('sends a receipt only for a paid order that has not already been emailed', () => {
  assert.equal(shouldSendReceipt('paid', null), true)
  assert.equal(shouldSendReceipt('paid', undefined), true)
  assert.equal(shouldSendReceipt('paid', '2026-10-11T00:00:00.000Z'), false)
  for (const status of ['unpaid', 'failed', 'canceled', 'cancelled', 'processing', 'refunded', 'partial_refund']) {
    assert.equal(shouldSendReceipt(status, null), false)
  }
})

test('receipt includes order number, line details, CAD totals, and the shipping address', () => {
  const html = buildOrderConfirmationHtml(receipt)
  const text = buildOrderConfirmationText(receipt)
  for (const body of [html, text]) {
    assert.match(body, /KN-261011-ABC123/)
    assert.match(body, /Night Hoodie/)
    assert.match(body, /Size: M/)
    assert.match(body, /Color: Black/)
    assert.match(body, /CAD/)
    assert.match(body, /Subtotal/)
    assert.match(body, /Discount/)
    assert.match(body, /Shipping/)
    assert.match(body, /Tax/)
    assert.match(body, /Total/)
    assert.match(body, /1 King St/)
  }
  assert.match(html, />2</)
  assert.equal(currencyCode('cad'), 'CAD')
  assert.equal(currencyCode(''), 'CAD')
})

test('does not call Resend when receipt mail is not configured', async () => {
  let calls = 0
  const result = await deliverReceiptEmail(receipt, {}, async () => {
    calls += 1
    return new Response('nope', { status: 500 })
  })
  assert.equal(result.delivered, false)
  assert.equal(result.provider, 'unconfigured')
  assert.equal(calls, 0)
})

test('sends the receipt from the configured address to the customer', async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = []
  const result = await deliverReceiptEmail(
    receipt,
    { resendApiKey: 're_test', resendFrom: 'Krewnox <receipts@krewnox.ca>', replyTo: 'desk@krewnox.ca' },
    async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) })
      return new Response('{}', { status: 200 })
    },
  )
  assert.equal(result.delivered, true)
  assert.equal(result.provider, 'resend')
  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.url, 'https://api.resend.com/emails')
  assert.equal(calls[0]?.body.from, 'Krewnox <receipts@krewnox.ca>')
  assert.deepEqual(calls[0]?.body.to, ['buyer@example.com'])
  assert.equal(calls[0]?.body.reply_to, 'desk@krewnox.ca')
  assert.notEqual(calls[0]?.body.from, 'buyer@example.com')
})
