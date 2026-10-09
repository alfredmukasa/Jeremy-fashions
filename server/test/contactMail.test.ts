import assert from 'node:assert/strict'
import test from 'node:test'

import { deliverContactEmail, isValidContactEmail } from '../src/services/contactMail.ts'

const notice = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  message: 'The hoodie size chart and my order number.',
  to: 'support@krewnox.ca',
}

test('stores the message path without calling Resend when credentials are missing', async () => {
  let calls = 0
  const result = await deliverContactEmail(notice, {}, async () => {
    calls += 1
    return new Response('nope', { status: 500 })
  })
  assert.equal(result.delivered, false)
  assert.equal(result.provider, 'unconfigured')
  assert.equal(calls, 0)
  assert.equal(isValidContactEmail('ada@example.com'), true)
})

test('sends one email with the customer as reply-to', async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = []
  const result = await deliverContactEmail(notice, { resendApiKey: 're_test', resendFrom: 'Krewnox <support@krewnox.ca>' }, async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) })
    return new Response('{}', { status: 200 })
  })
  assert.equal(result.delivered, true)
  assert.equal(result.provider, 'resend')
  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.body.reply_to, 'ada@example.com')
  assert.deepEqual(calls[0]?.body.to, ['support@krewnox.ca'])
})
