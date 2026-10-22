import { createHash } from 'node:crypto'
import type { Session } from '@supabase/supabase-js'

export const ADMIN_PASSWORD_MAX_LENGTH = 128
export type AdminLoginLimit = {
  allowed: boolean
  retryAfterSeconds: number
  attemptsRemaining: number
}
export type AdminLoginDependencies = {
  consume: (ipKey: string, identityKey: string) => Promise<AdminLoginLimit>
  authenticate: (email: string, password: string) => Promise<Session | null>
  clearIdentity: (identityKey: string) => Promise<void>
  discardSession: () => Promise<void>
  allowedEmails: string[]
}

export function adminLoginKeys(ip: string, email: string) {
  const hash = (value: string) =>
    createHash('sha256').update(value).digest('hex')
  return {
    ipKey: hash(`admin-login-ip:${ip}`),
    identityKey: hash(`admin-login:${ip}:${email.trim().toLowerCase()}`),
  }
}

export async function attemptAdminLogin(
  body: unknown,
  ip: string,
  deps: AdminLoginDependencies,
) {
  const input =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const email =
    typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length > ADMIN_PASSWORD_MAX_LENGTH
  ) {
    return {
      status: 400,
      body: {
        error: 'Enter a valid email and a password of up to 128 characters.',
      },
    }
  }
  const { ipKey, identityKey } = adminLoginKeys(ip, email)
  const limit = await deps.consume(ipKey, identityKey)
  if (!limit.allowed)
    return {
      status: 429,
      body: {
        error: 'Too many sign-in attempts. Please try again later.',
        retryAfterSeconds: limit.retryAfterSeconds,
      },
    }
  const session = await deps.authenticate(email, password)
  const allowed =
    session?.user.app_metadata?.role === 'admin' &&
    (!deps.allowedEmails.length ||
      deps.allowedEmails.includes(session.user.email?.toLowerCase() ?? ''))
  if (!session || !allowed) {
    if (session) await deps.discardSession()
    return {
      status: 401,
      body: {
        error: 'Sign-in failed. Check your details and try again.',
        retryAfterSeconds: limit.retryAfterSeconds,
        attemptsRemaining: limit.attemptsRemaining,
      },
    }
  }
  await deps.clearIdentity(identityKey)
  // Return only the tokens needed by Supabase's browser session client.
  return {
    status: 200,
    body: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    },
  }
}
