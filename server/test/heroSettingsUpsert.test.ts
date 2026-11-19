import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import test from 'node:test'
import express from 'express'
import { DatabaseSync } from 'node:sqlite'

import { d1Client } from '../src/lib/d1Client.ts'
import { dataRouter } from '../src/routes/data.ts'
import { signSession } from '../src/lib/session.ts'

const HERO = {
  slides: [
    {
      src: 'https://cdn.example/hero-a.jpg',
      alt: 'Look one',
      title: 'Season 06',
      ctaLabel: 'Shop collection',
    },
  ],
}

const UPDATED = {
  slides: [
    {
      src: 'https://cdn.example/hero-b.jpg',
      alt: 'Look two',
      title: 'Season 07',
      ctaLabel: 'View the drop',
    },
  ],
}

function listen(app: express.Express): Promise<{ server: Server; url: string }> {
  const server = createServer(app)
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Test server did not bind')
      resolve({ server, url: `http://127.0.0.1:${address.port}` })
    })
  })
}

test('rows with an id still upsert on id', async () => {
  const original = globalThis.fetch
  let sql = ''
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init && 'body' in init ? init.body : '{}')) as { sql?: string }
    sql = body.sql ?? ''
    return new Response(JSON.stringify({ success: true, result: [{ results: [{ id: 'row-1' }] }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  try {
    const result = await d1Client.from('profiles').upsert({ id: 'row-1', email: 'a@example.com' })
    assert.equal(result.error, null)
    assert.match(sql, /ON CONFLICT\(id\)/)
  } finally {
    globalThis.fetch = original
  }
})

test('admin hero save upserts site_settings on key', async () => {
  const db = new DatabaseSync(':memory:')
  db.exec(`CREATE TABLE site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`)

  const original = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (!target.includes('api.cloudflare.com')) return original(input, init)
    const body = JSON.parse(String(init && 'body' in init ? init.body : '{}')) as { sql?: string; params?: unknown[] }
    const sql = body.sql ?? ''
    if (sql.startsWith('INSERT')) {
      assert.match(sql, /ON CONFLICT\(key\)/)
      assert.doesNotMatch(sql, /ON CONFLICT\(id\)/)
    }
    const rows = db.prepare(sql).all(...(body.params ?? [])) as Array<Record<string, unknown>>
    return new Response(JSON.stringify({ success: true, result: [{ results: rows.map((row) => ({ ...row })) }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const app = express()
  app.use(express.json())
  app.use('/api/data', dataRouter)
  const { server, url } = await listen(app)
  const token = signSession({
    id: 'admin-1',
    email: 'admin@example.com',
    app_metadata: { role: 'admin' },
    user_metadata: {},
  })

  try {
    const save = (value: Record<string, unknown>, updatedAt: string) =>
      fetch(`${url}/api/data`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          table: 'site_settings',
          action: 'upsert',
          values: { key: 'hero_slides', value, updated_at: updatedAt },
        }),
      })

    const created = await save(HERO, '2026-11-18T12:00:00.000Z')
    const createdBody = (await created.json()) as { error: { message: string } | null }
    assert.equal(created.status, 200, JSON.stringify(createdBody))
    assert.equal(createdBody.error, null)

    const replaced = await save(UPDATED, '2026-11-18T13:00:00.000Z')
    const replacedBody = (await replaced.json()) as { error: { message: string } | null; data: Array<{ value: unknown }> }
    assert.equal(replaced.status, 200, JSON.stringify(replacedBody))
    assert.equal(replacedBody.error, null)
    assert.equal(replacedBody.data[0]?.value && (replacedBody.data[0].value as { slides: { src: string }[] }).slides[0]?.src, UPDATED.slides[0].src)

    const stored = db.prepare('SELECT key, value FROM site_settings').all() as Array<{ key: string; value: string }>
    assert.equal(stored.length, 1)
    assert.equal(stored[0]?.key, 'hero_slides')
    assert.equal(JSON.parse(stored[0]?.value ?? '{}').slides[0].src, UPDATED.slides[0].src)

    const loaded = await fetch(`${url}/api/data`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ table: 'site_settings', action: 'select', columns: 'key, value' }),
    })
    const loadedBody = (await loaded.json()) as { error: { message: string } | null; data: Array<{ key: string; value: { slides: { src: string }[] } }> }
    assert.equal(loaded.status, 200)
    assert.equal(loadedBody.error, null)
    assert.equal(loadedBody.data.find((row) => row.key === 'hero_slides')?.value.slides[0]?.src, UPDATED.slides[0].src)
  } finally {
    globalThis.fetch = original
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    db.close()
  }
})
