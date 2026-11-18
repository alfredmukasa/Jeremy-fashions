import { Router } from 'express'
import type { Session } from '@supabase/supabase-js'

import {
  attemptAdminLogin,
  type AdminLoginLimit,
} from '../services/adminLogin.js'
import { loginWithPassword } from '../services/cloudflareAuth.js'

const attempts = new Map<string, { count: number; start: number }>()

export const adminAuthRouter = Router()
adminAuthRouter.post('/password', async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  res.set('Pragma', 'no-cache')
  try {
    const result = await attemptAdminLogin(req.body, req.ip || 'unknown', {
      consume: async (ipKey, identityKey) => {
        const key = `${ipKey}:${identityKey}`
        const now = Date.now()
        const current = attempts.get(key)
        if (!current || now - current.start > 15 * 60 * 1000) {
          attempts.set(key, { count: 1, start: now })
          return { allowed: true, retryAfterSeconds: 0, attemptsRemaining: 7 }
        }
        current.count += 1
        const limit: AdminLoginLimit = current.count > 8
          ? { allowed: false, retryAfterSeconds: 900, attemptsRemaining: 0 }
          : { allowed: true, retryAfterSeconds: 0, attemptsRemaining: Math.max(0, 8 - current.count) }
        return limit
      },
      authenticate: async (email, password) => {
        const signedIn = await loginWithPassword(email, password)
        if (!signedIn) return null
        return {
          access_token: signedIn.token,
          refresh_token: signedIn.token,
          user: { id: signedIn.user.id, email: signedIn.user.email, app_metadata: signedIn.user.app_metadata },
        } as Session
      },
      clearIdentity: async (identityKey) => {
        for (const key of attempts.keys()) if (key.includes(identityKey)) attempts.delete(key)
      },
      discardSession: async () => undefined,
      allowedEmails: (process.env.VITE_ADMIN_ALLOWED_EMAILS ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    })
    if ('retryAfterSeconds' in result.body && result.body.retryAfterSeconds)
      res.set('Retry-After', String(result.body.retryAfterSeconds))
    return res.status(result.status).json(result.body)
  } catch {
    return res
      .status(503)
      .json({
        error:
          'Staff sign-in is temporarily unavailable. Please try again shortly.',
      })
  }
})
