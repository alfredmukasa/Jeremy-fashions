import assert from 'node:assert/strict'
import test from 'node:test'

import { parseJsonValue } from '../server/src/domain/publicCatalogRows.ts'
import { parseShippingRates as parseServerRates } from '../server/src/domain/shippingRates.ts'
import { calculateCheckoutTotals } from '../src/utils/checkoutTotals.ts'
import { parseShippingRates as parseClientRates } from '../src/lib/shippingRates.ts'

test('client and server decode D1 JSON strings instead of using the CA$12 default', () => {
  const stored = '{"flatRate":15,"freeThreshold":250,"currency":"CAD"}'
  const decoded = parseJsonValue(stored)

  const server = parseServerRates(stored)
  const client = parseClientRates(stored)
  const fromDecoded = parseServerRates(decoded)

  assert.equal(server.flatRate, 15)
  assert.equal(client.flatRate, 15)
  assert.equal(fromDecoded.flatRate, 15)
  assert.equal(server.freeThreshold, 250)
  assert.equal(client.freeThreshold, 250)
  assert.equal(parseServerRates('{"flatRate":9,"freeThreshold":null}').freeThreshold, null)
  assert.equal(parseClientRates('{"flatRate":9,"freeThreshold":null}').freeThreshold, null)
  assert.deepEqual(parseServerRates('{"flatRate":25,"freeThreshold":null,"currency":"CAD"}'), {
    flatRate: 25,
    freeThreshold: null,
  })
  assert.equal(calculateCheckoutTotals(40, 0, client).shipping, 15)
  assert.equal(parseServerRates('not-json').flatRate, 12)
  assert.equal(parseClientRates(undefined).flatRate, 12)
})

test('loadShippingRates reads the admin JSON string stored in D1', async () => {
  process.env.STRIPE_SECRET_KEY ??= 'sk_test_placeholder'
  process.env.SUPABASE_URL ??= 'https://example.supabase.co'
  process.env.SUPABASE_ANON_KEY ??= 'test-placeholder'
  process.env.CLOUDFLARE_ACCOUNT_ID ??= 'account'
  process.env.CLOUDFLARE_API_TOKEN ??= 'token'
  process.env.CLOUDFLARE_D1_DATABASE_ID ??= 'database'

  const original = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        result: [{ results: [{ value: '{"flatRate":15,"freeThreshold":200,"currency":"CAD"}' }] }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )

  try {
    const { loadShippingRates } = await import('../server/src/services/shippingSettings.ts')
    const rates = await loadShippingRates()
    assert.equal(rates.flatRate, 15)
    assert.equal(rates.freeThreshold, 200)
  } finally {
    globalThis.fetch = original
  }
})
