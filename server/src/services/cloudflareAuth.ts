import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { queryD1 } from '../lib/d1.js'
import { d1Client } from '../lib/d1Client.js'
import { signSession, type SessionUser } from '../lib/session.js'

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
    )`).then(() => undefined)
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
