import assert from 'node:assert/strict'
import test from 'node:test'
import type { Session } from '@supabase/supabase-js'
import {
  adminLoginKeys,
  attemptAdminLogin,
  type AdminLoginDependencies,
} from '../src/services/adminLogin.ts'

const body = { email: 'Admin@Example.com', password: 'existing-password' }
const session = {
  access_token: 'access-test',
  refresh_token: 'refresh-test',
  user: {
    id: 'admin',
    email: 'admin@example.com',
    app_metadata: { role: 'admin' },
  },
} as Session
function dependencies(
  partial: Partial<AdminLoginDependencies> = {},
): AdminLoginDependencies {
  return {
    consume: async () => ({
      allowed: true,
      retryAfterSeconds: 0,
      attemptsRemaining: 4,
    }),
    authenticate: async () => session,
    clearIdentity: async () => {},
    discardSession: async () => {},
    allowedEmails: [],
    ...partial,
  }
}

test('valid staff credentials return only session tokens, normalize email, and reset the identity limit', async () => {
  let reset = ''
  const result = await attemptAdminLogin(
    body,
    '127.0.0.1',
    dependencies({
      authenticate: async (email, password) => {
        assert.equal(email, 'admin@example.com')
        assert.equal(password, body.password)
        return session
      },
      clearIdentity: async (key) => {
        reset = key
      },
    }),
  )
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, {
    access_token: 'access-test',
    refresh_token: 'refresh-test',
  })
  assert.equal(reset, adminLoginKeys('127.0.0.1', body.email).identityKey)
})

test('oversized passwords and malformed emails are rejected before authentication', async () => {
  const deps = dependencies({
    authenticate: async () => {
      throw new Error('must not authenticate')
    },
    consume: async () => {
      throw new Error('must not consume')
    },
  })
  for (const input of [
    { ...body, password: 'x'.repeat(129) },
    { ...body, email: 'invalid' },
    { ...body, password: '' },
    null,
  ]) {
    assert.equal((await attemptAdminLogin(input, 'ip', deps)).status, 400)
  }
})

test('server cooldown rejects attempts without contacting the password provider', async () => {
  const result = await attemptAdminLogin(
    body,
    'ip',
    dependencies({
      consume: async () => ({
        allowed: false,
        retryAfterSeconds: 900,
        attemptsRemaining: 0,
      }),
      authenticate: async () => {
        throw new Error('must not authenticate')
      },
    }),
  )
  assert.equal(result.status, 429)
  assert.equal(result.body.retryAfterSeconds, 900)
})

test('customers and disallowed staff do not receive tokens even with a correct password', async () => {
  for (const deps of [
    dependencies({
      authenticate: async () => ({
        ...session,
        user: { ...session.user, app_metadata: { role: 'customer' } },
      }),
    }),
    dependencies({ allowedEmails: ['different@example.com'] }),
  ]) {
    let discarded = false
    deps.discardSession = async () => {
      discarded = true
    }
    const result = await attemptAdminLogin(body, 'ip', deps)
    assert.equal(result.status, 401)
    assert.equal('access_token' in result.body, false)
    assert.equal(discarded, true)
  }
})

test('incorrect password uses the same generic denial and passes through the final-attempt cooldown', async () => {
  const result = await attemptAdminLogin(
    body,
    'ip',
    dependencies({
      consume: async () => ({
        allowed: true,
        retryAfterSeconds: 900,
        attemptsRemaining: 0,
      }),
      authenticate: async () => null,
    }),
  )
  assert.equal(result.status, 401)
  assert.equal(result.body.retryAfterSeconds, 900)
  assert.equal(result.body.attemptsRemaining, 0)
  assert.equal('access_token' in result.body, false)
})

test('database failure fails closed and hashes identifiers without including passwords', async () => {
  await assert.rejects(
    attemptAdminLogin(
      body,
      'ip',
      dependencies({
        consume: async () => {
          throw new Error('offline')
        },
        authenticate: async () => {
          throw new Error('must not authenticate')
        },
      }),
    ),
    /offline/,
  )
  const keys = adminLoginKeys('127.0.0.1', body.email)
  assert.match(keys.ipKey, /^[a-f0-9]{64}$/)
  assert.match(keys.identityKey, /^[a-f0-9]{64}$/)
  assert.deepEqual(keys, adminLoginKeys('127.0.0.1', 'admin@example.com'))
  assert.notEqual(
    keys.identityKey,
    adminLoginKeys('127.0.0.2', body.email).identityKey,
  )
})
