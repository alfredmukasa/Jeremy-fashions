import { createClient } from '@supabase/supabase-js'
import { Router } from 'express'

import { config } from '../config.js'
import { requireSupabaseAdmin } from '../lib/supabase.js'
import {
  attemptAdminLogin,
  type AdminLoginLimit,
} from '../services/adminLogin.js'

export const adminAuthRouter = Router()
adminAuthRouter.post('/password', async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  res.set('Pragma', 'no-cache')
  try {
    const db = requireSupabaseAdmin()
    // An isolated client prevents simultaneous sign-ins sharing server session state.
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    const result = await attemptAdminLogin(req.body, req.ip || 'unknown', {
      consume: async (ipKey, identityKey) => {
        const { data, error } = await db.rpc('claim_admin_login_attempt', {
          p_ip_key: ipKey,
          p_identity_key: identityKey,
        })
        if (error || !data) throw new Error('Login protection is unavailable.')
        return data as AdminLoginLimit
      },
      authenticate: async (email, password) => {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        })
        return error ? null : data.session
      },
      clearIdentity: async (identityKey) => {
        const { error } = await db
          .from('admin_login_limits')
          .delete()
          .eq('bucket_key', `identity:${identityKey}`)
        if (error) throw new Error('Login protection is unavailable.')
      },
      discardSession: async () => {
        await client.auth.signOut({ scope: 'local' })
      },
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
