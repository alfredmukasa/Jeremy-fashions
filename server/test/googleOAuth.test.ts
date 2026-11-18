import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  GOOGLE_AUTH_ENDPOINT,
  buildGoogleAuthUrl,
  createPkcePair,
  exchangeGoogleCode,
  sanitizeNext,
  signOAuthState,
  verifyGoogleIdToken,
  verifyOAuthState,
} from '../src/services/googleOAuth.ts'

const SECRET = 'test-oauth-secret'

function futureExp(seconds = 300): number {
  return Math.floor(Date.now() / 1000) + seconds
}

function makeIdToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.signature`
}

test('PKCE challenge is the base64url SHA-256 of the verifier', () => {
  const { verifier, challenge } = createPkcePair()
  assert.ok(verifier.length >= 32)
  const expected = createHash('sha256').update(verifier).digest('base64url')
  assert.equal(challenge, expected)
})

test('sanitizeNext only permits same-site paths', () => {
  assert.equal(sanitizeNext('/orders'), '/orders')
  assert.equal(sanitizeNext('/account'), '/account')
  assert.equal(sanitizeNext('//evil.example.com'), '/account')
  assert.equal(sanitizeNext('https://evil.example.com'), '/account')
  assert.equal(sanitizeNext(undefined), '/account')
  assert.equal(sanitizeNext(42), '/account')
})

test('authorization URL carries the OIDC params and PKCE challenge', () => {
  const url = new URL(
    buildGoogleAuthUrl({
      clientId: 'client-123',
      redirectUri: 'https://krewnox.ca/api/auth/google/callback',
      state: 'state-abc',
      codeChallenge: 'challenge-xyz',
      prompt: 'select_account',
    }),
  )
  assert.equal(`${url.origin}${url.pathname}`, GOOGLE_AUTH_ENDPOINT)
  assert.equal(url.searchParams.get('client_id'), 'client-123')
  assert.equal(url.searchParams.get('redirect_uri'), 'https://krewnox.ca/api/auth/google/callback')
  assert.equal(url.searchParams.get('response_type'), 'code')
  assert.equal(url.searchParams.get('scope'), 'openid email profile')
  assert.equal(url.searchParams.get('state'), 'state-abc')
  assert.equal(url.searchParams.get('code_challenge'), 'challenge-xyz')
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(url.searchParams.get('prompt'), 'select_account')
})

test('OAuth state cookie round-trips and rejects tampering/expiry', () => {
  const payload = { state: 's1', verifier: 'v1', next: '/account', exp: futureExp() }
  const token = signOAuthState(payload, SECRET)
  assert.deepEqual(verifyOAuthState(token, SECRET), payload)
  assert.equal(verifyOAuthState(token, 'wrong-secret'), null)
  assert.equal(verifyOAuthState(`${token}x`, SECRET), null)
  assert.equal(verifyOAuthState(undefined, SECRET), null)
  const expired = signOAuthState({ ...payload, exp: Math.floor(Date.now() / 1000) - 10 }, SECRET)
  assert.equal(verifyOAuthState(expired, SECRET), null)
})

test('verifies a valid Google id_token and normalizes the email', () => {
  const token = makeIdToken({
    iss: 'https://accounts.google.com',
    aud: 'client-123',
    exp: futureExp(),
    email: 'User@Example.com',
    email_verified: true,
    name: 'Ada Lovelace',
    sub: '12345',
    picture: 'https://example.com/a.png',
  })
  const identity = verifyGoogleIdToken(token, 'client-123')
  assert.equal(identity.email, 'user@example.com')
  assert.equal(identity.emailVerified, true)
  assert.equal(identity.name, 'Ada Lovelace')
  assert.equal(identity.sub, '12345')
  assert.equal(identity.picture, 'https://example.com/a.png')
})

test('rejects id_tokens with a bad issuer, audience, expiry, or unverified email', () => {
  const base = { iss: 'https://accounts.google.com', aud: 'client-123', exp: futureExp(), email: 'a@b.com', email_verified: true }
  assert.throws(() => verifyGoogleIdToken(makeIdToken({ ...base, iss: 'https://evil.com' }), 'client-123'), /issuer/)
  assert.throws(() => verifyGoogleIdToken(makeIdToken({ ...base, aud: 'other-client' }), 'client-123'), /different client/)
  assert.throws(() => verifyGoogleIdToken(makeIdToken({ ...base, exp: Math.floor(Date.now() / 1000) - 10 }), 'client-123'), /expired/)
  assert.throws(() => verifyGoogleIdToken(makeIdToken({ ...base, email_verified: false }), 'client-123'), /not verified/)
  assert.throws(() => verifyGoogleIdToken(makeIdToken({ ...base, email: '' }), 'client-123'), /email/)
  assert.throws(() => verifyGoogleIdToken('nonsense', 'client-123'), /Malformed/)
})

test('accepts an id_token whose audience is an array containing the client id', () => {
  const token = makeIdToken({
    iss: 'accounts.google.com',
    aud: ['client-123', 'other'],
    exp: futureExp(),
    email: 'a@b.com',
    email_verified: 'true',
  })
  const identity = verifyGoogleIdToken(token, 'client-123')
  assert.equal(identity.email, 'a@b.com')
})

test('exchanges an authorization code for an id_token and surfaces errors', async () => {
  const calls: Array<{ url: string; body: string }> = []
  const ok = await exchangeGoogleCode(
    { code: 'auth-code', verifier: 'v1', credentials: { clientId: 'c', clientSecret: 's', redirectUri: 'https://krewnox.ca/api/auth/google/callback' } },
    async (url, init) => {
      calls.push({ url: String(url), body: String(init?.body) })
      return new Response(JSON.stringify({ id_token: 'the-id-token' }), { status: 200 })
    },
  )
  assert.equal(ok.idToken, 'the-id-token')
  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.url, 'https://oauth2.googleapis.com/token')
  assert.match(calls[0]?.body ?? '', /grant_type=authorization_code/)
  assert.match(calls[0]?.body ?? '', /code_verifier=v1/)

  await assert.rejects(
    exchangeGoogleCode(
      { code: 'bad', verifier: 'v1', credentials: { clientId: 'c', clientSecret: 's', redirectUri: 'r' } },
      async () => new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'bad code' }), { status: 400 }),
    ),
    /token exchange failed/,
  )
})
