import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { queryD1 } from '../lib/d1.js'
import { d1Client } from '../lib/d1Client.js'
import { signSession, type SessionUser } from '../lib/session.js'
import type { GoogleIdentity } from './googleOAuth.js'
import { RESET_TOKEN_TTL_MS, generateResetToken, hashResetToken, isResetTokenExpired } from './passwordReset.js'

let ready: Promise<void> | null = null
export function ensureAuthTables(): Promise<void> {
  ready ??= queryD1(`CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      full_name TEXT,
      app_metadata TEXT NOT NULL DEFAULT '{}',
      user_metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
    .then(() => queryD1(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`))
    .then(() => undefined)
  return ready
}
type UserRow = { id: string; email: string; password_hash: string | null; full_name: string | null; app_metadata: string; user_metadata: string }
function parseMeta(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch { return {} }
}
function toSessionUser(row: UserRow): SessionUser {
  return { id: row.id, email: row.email, app_metadata: parseMeta(row.app_metadata), user_metadata: { ...parseMeta(row.user_metadata), full_name: row.full_name } }
}
async function findByEmail(email: string): Promise<UserRow | null> {
  const rows = await queryD1<UserRow>('SELECT * FROM app_users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()])
  return rows[0] ?? null
}
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url')
  const hash = scryptSync(password, salt, 32).toString('base64url')
  return `scrypt$${salt}$${hash}`
}
export function passwordMatches(password: string, stored: string | null): boolean {
  if (!stored) return false
  if (stored.startsWith('scrypt$')) {
    const [, salt, hash] = stored.split('$')
    if (!salt || !hash) return false
    const actual = Buffer.from(scryptSync(password, salt, 32).toString('base64url'))
    const expected = Buffer.from(hash)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) return bcrypt.compareSync(password, stored)
  return false
}
export async function loginWithPassword(email: string, password: string) {
  await ensureAuthTables()
  const row = await findByEmail(email)
  if (!row || !passwordMatches(password, row.password_hash)) return null
  const user = toSessionUser(row)
  return { token: signSession(user), user }
}
export async function registerAccount(input: { email: string; password: string; fullName: string }) {
  await ensureAuthTables()
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' }
  if (input.password.length < 8) return { error: 'Use at least 8 characters for your password.' }
  if (await findByEmail(email)) return { error: 'An account with that email already exists. Sign in instead.' }
  const user: SessionUser = { id: randomUUID(), email, app_metadata: {}, user_metadata: { full_name: input.fullName } }
  await queryD1(
    'INSERT INTO app_users (id, email, password_hash, full_name, app_metadata, user_metadata) VALUES (?, ?, ?, ?, ?, ?)',
    [user.id, email, hashPassword(input.password), input.fullName, '{}', JSON.stringify(user.user_metadata)],
  )
  await d1Client.from('profiles').insert({ id: user.id, email, full_name: input.fullName })
  return { token: signSession(user), user }
}
export async function updatePassword(userId: string, password: string): Promise<string | null> {
  await ensureAuthTables()
  if (password.length < 8) return 'Use at least 8 characters for your password.'
  const result = await d1Client.from('app_users').update({ password_hash: hashPassword(password) }).eq('id', userId)
  return result.error ? 'Unable to update the password.' : null
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))]
}

/**
 * Google sign-in find-or-create.
 *
 * Account-linking policy: a Google identity is keyed by its verified email. If an
 * `app_users` row already exists for that email — whether it was created by password
 * sign-up or a previous Google login — we link to it (merge `provider`/`providers` into
 * `app_metadata`, keep the existing password hash untouched) rather than creating a
 * duplicate. New Google users are created with a NULL password hash so they cannot be
 * signed in through the password form until they explicitly set one via password reset.
 */
export async function upsertGoogleUser(identity: GoogleIdentity) {
  await ensureAuthTables()
  const email = identity.email.trim().toLowerCase()
  const existing = await findByEmail(email)

  if (existing) {
    const appMeta = parseMeta(existing.app_metadata)
    const providers = uniqueStrings([...(Array.isArray(appMeta.providers) ? appMeta.providers : []), appMeta.provider, 'google'])
    appMeta.providers = providers
    appMeta.provider = typeof appMeta.provider === 'string' && appMeta.provider ? appMeta.provider : 'google'
    const userMeta = parseMeta(existing.user_metadata)
    const fullName = existing.full_name || identity.name || (typeof userMeta.full_name === 'string' ? userMeta.full_name : '')
    userMeta.full_name = fullName
    if (identity.picture) userMeta.avatar_url = identity.picture
    userMeta.email_verified = true
    await d1Client
      .from('app_users')
      .update({ app_metadata: JSON.stringify(appMeta), user_metadata: JSON.stringify(userMeta), full_name: fullName })
      .eq('id', existing.id)
    const user: SessionUser = { id: existing.id, email, app_metadata: appMeta, user_metadata: { ...userMeta, full_name: fullName } }
    return { token: signSession(user), user, linked: true }
  }

  const appMetadata = { provider: 'google', providers: ['google'] }
  const userMetadata: Record<string, unknown> = { full_name: identity.name, email_verified: true }
  if (identity.picture) userMetadata.avatar_url = identity.picture
  const user: SessionUser = { id: randomUUID(), email, app_metadata: appMetadata, user_metadata: userMetadata }
  await queryD1(
    'INSERT INTO app_users (id, email, password_hash, full_name, app_metadata, user_metadata) VALUES (?, ?, ?, ?, ?, ?)',
    [user.id, email, null, identity.name, JSON.stringify(appMetadata), JSON.stringify(userMetadata)],
  )
  await d1Client.from('profiles').upsert({ id: user.id, email, full_name: identity.name }, { onConflict: 'id' })
  return { token: signSession(user), user, linked: false }
}

/**
 * Creates a single-use reset token for the account, invalidating any earlier ones.
 * Returns null when no account exists so the caller can still respond generically
 * (no user enumeration).
 */
export async function createPasswordResetToken(email: string): Promise<{ token: string; email: string } | null> {
  await ensureAuthTables()
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null
  const row = await findByEmail(normalized)
  if (!row) return null
  await queryD1('DELETE FROM password_reset_tokens WHERE user_id = ?', [row.id])
  const token = generateResetToken()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString()
  await queryD1(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [randomUUID(), row.id, hashResetToken(token), expiresAt],
  )
  return { token, email: normalized }
}

type ResetTokenRow = { id: string; user_id: string; expires_at: string; used_at: string | null }

/** Verifies the token (hash + expiry + single-use) and writes the new password hash. */
export async function resetPasswordWithToken(token: string, password: string): Promise<string | null> {
  await ensureAuthTables()
  if (typeof token !== 'string' || token.length < 10) return 'This reset link is invalid or has expired.'
  if (password.length < 8) return 'Use at least 8 characters for your password.'
  const rows = await queryD1<ResetTokenRow>(
    'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? LIMIT 1',
    [hashResetToken(token)],
  )
  const record = rows[0]
  if (!record || record.used_at || isResetTokenExpired(record.expires_at)) {
    return 'This reset link is invalid or has expired.'
  }
  const update = await d1Client.from('app_users').update({ password_hash: hashPassword(password) }).eq('id', record.user_id)
  if (update.error) return 'Unable to update the password.'
  await queryD1('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?', [new Date().toISOString(), record.id])
  await queryD1('DELETE FROM password_reset_tokens WHERE user_id = ? AND id != ?', [record.user_id, record.id])
  return null
}
