import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

test('persistent admin rate limits enforce account/IP and IP quotas, expiry, and service-only access', async () => {
  const db = new PGlite()
  const ip = 'a'.repeat(64),
    identity = 'b'.repeat(64)
  try {
    await db.exec(
      'create role anon; create role authenticated; create role service_role bypassrls;',
    )
    await db.exec(
      await readFile(
        new URL(
          '../supabase/migrations/0023_admin_login_limits.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    )
    const claim = async (ipKey = ip, identityKey = identity) =>
      (
        await db.query<{
          value: {
            allowed: boolean
            attemptsRemaining: number
            retryAfterSeconds: number
          }
        }>('select claim_admin_login_attempt($1,$2) as value', [
          ipKey,
          identityKey,
        ])
      ).rows[0].value
    await db.exec('set role service_role')
    const attempts = await Promise.all(Array.from({ length: 6 }, () => claim()))
    assert.equal(attempts.filter((result) => result.allowed).length, 5)
    assert.equal(attempts[4].attemptsRemaining, 0)
    assert.equal(attempts[5].allowed, false)
    assert.ok(
      attempts[5].retryAfterSeconds > 0 && attempts[5].retryAfterSeconds <= 900,
    )
    await db.query('delete from admin_login_limits where bucket_key=$1', [
      `identity:${identity}`,
    ])
    assert.equal(
      (await claim()).allowed,
      true,
      'successful sign-in can clear only the identity counter',
    )
    for (let index = 7; index < 20; index++)
      assert.equal(
        (await claim(ip, index.toString(16).padStart(64, '0'))).allowed,
        true,
      )
    assert.equal(
      (await claim(ip, 'f'.repeat(64))).allowed,
      false,
      'changing email does not bypass the network quota',
    )
    await db.exec(
      "update admin_login_limits set expires_at=now()-interval '1 second'",
    )
    assert.equal((await claim()).allowed, true)
    await db.exec('reset role; set role anon')
    await assert.rejects(claim(), /permission denied/)
    await assert.rejects(
      db.query('select * from admin_login_limits'),
      /permission denied/,
    )
    await db.exec('reset role; set role authenticated')
    await assert.rejects(claim(), /permission denied/)
    await assert.rejects(
      db.query('delete from admin_login_limits'),
      /permission denied/,
    )
  } finally {
    await db.close()
  }
})
