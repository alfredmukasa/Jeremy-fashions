import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildAdminPurchaseEmail,
  deliverAdminPurchaseEmail,
  readPurchaseEmailSettings,
  sendAdminPurchaseEmailIfNeeded,
} from '../src/services/adminPurchaseEmail.ts'

const order = {
  id: 'order-1',
  order_number: 'KN-TEST',
  email: 'customer@example.com',
  total_amount: 123.45,
  currency: 'cad',
  order_items: [
    { title: 'Quarter zip', quantity: 2, size: 'M', color_name: 'Black' },
  ],
}
const payload = buildAdminPurchaseEmail(
  order,
  'Store <orders@krewnox.ca>',
  'admin@example.com',
  'https://krewnox.ca/krewnox-admin/orders',
)

test('admin purchase email includes paid order, customer, items, total and staff link', () => {
  assert.deepEqual(payload.to, ['admin@example.com'])
  for (const expected of [
    'payment confirmed',
    'KN-TEST',
    'customer@example.com',
    '123.45',
    'CAD',
    '2 × Quarter zip',
    'Size: M',
    'Color: Black',
    '/krewnox-admin/orders',
  ])
    assert.ok(payload.text.includes(expected))
})

test('provider retries use the same idempotency key and do not address the customer', async () => {
  const keys: string[] = []
  for (let i = 0; i < 2; i++)
    await deliverAdminPurchaseEmail(
      order.id,
      payload,
      'test-key',
      async (_url, init) => {
        const body = JSON.parse(String(init?.body))
        assert.deepEqual(body.to, ['admin@example.com'])
        keys.push((init?.headers as Record<string, string>)['Idempotency-Key'])
        return new Response('{}', { status: 200 })
      },
    )
  assert.deepEqual(keys, ['admin-purchase/order-1', 'admin-purchase/order-1'])
  await assert.rejects(
    deliverAdminPurchaseEmail(
      order.id,
      payload,
      'test-key',
      async () => new Response('{}', { status: 429 }),
    ),
    /429/,
  )
})

function fakeDatabase(
  notice: Record<string, unknown> | null,
  settings: Array<{ key: string; value: unknown }> = [],
) {
  return {
    from: () => {
      let update: Record<string, unknown> | undefined
      const filters: Array<[string, unknown]> = []
      let leaseFilter = false
      const execute = async () => {
        if (
          !notice ||
          filters.some(([key, value]) => notice![key] !== value) ||
          (leaseFilter && notice.email_claimed_at)
        )
          return { data: null, error: null }
        if (update) Object.assign(notice, update)
        return { data: { ...notice }, error: null }
      }
      const query = {
        select: () => query,
        in: async () => ({ data: settings, error: null }),
        update: (value: Record<string, unknown>) => {
          update = value
          return query
        },
        eq: (key: string, value: unknown) => {
          filters.push([key, value])
          return query
        },
        is: (key: string, value: unknown) => {
          filters.push([key, value])
          return query
        },
        or: () => {
          leaseFilter = true
          return query
        },
        maybeSingle: execute,
        then: (resolve: (value: unknown) => unknown) => execute().then(resolve),
      }
      return query
    },
  } as unknown as SupabaseClient
}

test('uses the saved support recipient by default, permits a separate recipient, and respects disabled alerts', async () => {
  const support = {
    key: 'contact_recipient',
    value: { email: 'support@example.com' },
  }
  assert.deepEqual(
    await readPurchaseEmailSettings(fakeDatabase(null, [support])),
    { enabled: true, to: 'support@example.com' },
  )
  assert.deepEqual(
    await readPurchaseEmailSettings(
      fakeDatabase(null, [
        support,
        {
          key: 'purchase_notifications',
          value: { email: 'ops@example.com', enabled: true },
        },
      ]),
    ),
    { enabled: true, to: 'ops@example.com' },
  )
  const db = fakeDatabase(
    { order_id: order.id, email_payload: payload, email_sent_at: null },
    [support, { key: 'purchase_notifications', value: { enabled: false } }],
  )
  await sendAdminPurchaseEmailIfNeeded(order.id, db, async () => {
    throw new Error('disabled alerts must not send')
  })
})

test('concurrent handlers claim one email, persist acceptance, and retries skip it', async () => {
  process.env.RESEND_API_KEY = 'test-key'
  process.env.RESEND_FROM_EMAIL = payload.from
  const notice = {
    order_id: order.id,
    email_payload: payload,
    email_sent_at: null,
    email_claimed_at: null,
  }
  const db = fakeDatabase(notice)
  let calls = 0
  const send: typeof fetch = async () => {
    calls++
    return new Response('{}', { status: 200 })
  }
  await Promise.allSettled([
    sendAdminPurchaseEmailIfNeeded(order.id, db, send),
    sendAdminPurchaseEmailIfNeeded(order.id, db, send),
  ])
  assert.equal(calls, 1)
  assert.ok(notice.email_sent_at)
  await sendAdminPurchaseEmailIfNeeded(order.id, db, send)
  assert.equal(calls, 1)
})

test('failed delivery releases the lease for retry without marking sent; old orders are skipped', async () => {
  process.env.RESEND_API_KEY = 'test-key'
  process.env.RESEND_FROM_EMAIL = payload.from
  const notice = {
    order_id: order.id,
    email_payload: payload,
    email_sent_at: null,
    email_claimed_at: null,
    email_last_error: null,
  }
  const db = fakeDatabase(notice)
  await assert.rejects(
    sendAdminPurchaseEmailIfNeeded(
      order.id,
      db,
      async () => new Response('{}', { status: 503 }),
    ),
    /503/,
  )
  assert.equal(notice.email_sent_at, null)
  assert.equal(notice.email_claimed_at, null)
  assert.ok(notice.email_last_error)
  await sendAdminPurchaseEmailIfNeeded(
    order.id,
    db,
    async () => new Response('{}', { status: 200 }),
  )
  assert.ok(notice.email_sent_at)
  await sendAdminPurchaseEmailIfNeeded(
    'historical',
    fakeDatabase(null),
    async () => {
      throw new Error('must not send')
    },
  )
})
