import type { NextFunction, Request, Response } from 'express'

import { supabaseAnon } from '../lib/supabase.js'
import type { AuthenticatedUser } from '../types.js'

export type AuthedRequest = Request & {
  user?: AuthenticatedUser
  accessToken?: string
}

export async function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication is required to checkout.' })
  }

  const token = header.slice('Bearer '.length).trim()
  const { data, error } = await supabaseAnon.auth.getUser(token)

  if (error || !data.user?.id || !data.user.email) {
    return res.status(401).json({ error: 'Your session has expired. Sign in again and retry checkout.' })
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
  }
  req.accessToken = token

  return next()
}
