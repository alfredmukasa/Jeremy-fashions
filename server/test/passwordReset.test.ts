import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RESET_TOKEN_TTL_MS,
  buildPasswordResetHtml,
  buildPasswordResetText,
  buildResetLink,
  deliverPasswordResetEmail,
  generateResetToken,
  hashResetToken,
  isResetTokenExpired,
} from '../src/services/passwordReset.ts'

test('reset tokens are high-entropy, unique, and only ever stored as a hash', () => {
  const a = generateResetToken()
  const b = generateResetToken()
  assert.notEqual(a, b)
  assert.ok(a.length >= 32)
  const hash = hashResetToken(a)
  assert.equal(hash, hashResetToken(a))
  assert.notEqual(hash, a)
  assert.notEqual(hash, hashResetToken(b))
  assert.match(hash, /^[a-f0-9]{64}$/)
})

test('token expiry is evaluated against the stored timestamp', () => {
  const now = Date.now()
  const fresh = new Date(now + RESET_TOKEN_TTL_MS).toISOString()
  const stale = new Date(now - 1000).toISOString()
  assert.equal(isResetTokenExpired(fresh, now), false)
  assert.equal(isResetTokenExpired(stale, now), true)
  assert.equal(isResetTokenExpired('not-a-date', now), true)
})

test('reset link points at the reset-password route with the token', () => {
  assert.equal(
    buildResetLink('https://krewnox.ca', 'abc123'),
    'https://krewnox.ca/reset-password?token=abc123',
  )
  assert.equal(
    buildResetLink('https://krewnox.ca/', 'abc123'),
    'https://krewnox.ca/reset-password?token=abc123',
  )
})

test('reset email includes the link and expiry messaging', () => {
  const link = 'https://krewnox.ca/reset-password?token=xyz'
  const html = buildPasswordResetHtml(link)
  const text = buildPasswordResetText(link)
  for (const body of [html, text]) {
    assert.match(body, /KREWNOX/)
    assert.ok(body.includes(link))
    assert.match(body, /1 hour/)
    assert.match(body, /did not request/)
  }
})

test('does not call Resend when password reset mail is not configured', async () => {
  let calls = 0
  const result = await deliverPasswordResetEmail(
    { email: 'buyer@example.com', resetLink: 'https://krewnox.ca/reset-password?token=t' },
    {},
    async () => {
      calls += 1
      return new Response('nope', { status: 500 })
    },
  )
  assert.equal(result.delivered, false)
  assert.equal(result.provider, 'unconfigured')
  assert.equal(calls, 0)
})

test('sends the reset email from the configured address to the customer', async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = []
  const result = await deliverPasswordResetEmail(
    { email: 'buyer@example.com', resetLink: 'https://krewnox.ca/reset-password?token=t' },
    { resendApiKey: 're_test', resendFrom: 'Krewnox <support@krewnox.ca>', replyTo: 'desk@krewnox.ca' },
    async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) })
      return new Response('{}', { status: 200 })
    },
  )
  assert.equal(result.delivered, true)
  assert.equal(result.provider, 'resend')
  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.url, 'https://api.resend.com/emails')
  assert.equal(calls[0]?.body.from, 'Krewnox <support@krewnox.ca>')
  assert.deepEqual(calls[0]?.body.to, ['buyer@example.com'])
  assert.equal(calls[0]?.body.reply_to, 'desk@krewnox.ca')
  assert.ok(String(calls[0]?.body.html).includes('reset-password?token=t'))
})

test('rejects an invalid recipient when mail is configured', async () => {
  await assert.rejects(
    deliverPasswordResetEmail(
      { email: 'not-an-email', resetLink: 'https://krewnox.ca/reset-password?token=t' },
      { resendApiKey: 're_test', resendFrom: 'Krewnox <support@krewnox.ca>' },
      async () => new Response('{}', { status: 200 }),
    ),
    /valid email/,
  )
})
