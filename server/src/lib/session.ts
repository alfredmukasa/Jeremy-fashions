import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from '../config.js'

export type SessionUser = {
  id: string
  email: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
}
type TokenPayload = SessionUser & { exp: number }

function secret(): string {
  return process.env.AUTH_SESSION_SECRET?.trim() || config.cloudflareApiToken || ''
}

/** Shared HMAC key for session tokens and the OAuth state cookie. */
export function getSessionSecret(): string {
  return secret()
}

export function signSession(user: SessionUser, ttlSeconds = 60 * 60 * 24 * 14): string {
  const key = secret()
  if (!key) throw new Error('Auth session secret is not configured.')
  const body = Buffer.from(JSON.stringify({
    id: user.id,
    email: user.email,
    app_metadata: user.app_metadata ?? {},
    user_metadata: user.user_metadata ?? {},
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  })).toString('base64url')
  const signature = createHmac('sha256', key).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function readSession(token: string): SessionUser | null {
  const key = secret()
  const [body, signature] = token.split('.')
  if (!key || !body || !signature) return null
  const expected = createHmac('sha256', key).update(body).digest('base64url')
  const actual = Buffer.from(signature)
  const wanted = Buffer.from(expected)
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload
    if (!payload.id || !payload.email || payload.exp < Math.floor(Date.now() / 1000)) return null
    return { id: payload.id, email: payload.email, app_metadata: payload.app_metadata ?? {}, user_metadata: payload.user_metadata ?? {} }
  } catch {
    return null
  }
}
