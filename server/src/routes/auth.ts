import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import { requireUser } from '../middleware/auth.js'
import { loginWithPassword, registerAccount, updatePassword } from '../services/cloudflareAuth.js'

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })
  const result = await loginWithPassword(email, password)
  if (!result) return res.status(401).json({ error: 'Sign-in failed. Check your details and try again.' })
  return res.json({ access_token: result.token, refresh_token: result.token, user: result.user })
})

authRouter.post('/register', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim().slice(0, 120) : ''
  const result = await registerAccount({ email, password, fullName })
  if ('error' in result) return res.status(400).json({ error: result.error })
  return res.status(201).json({ access_token: result.token, refresh_token: result.token, user: result.user })
})

authRouter.post('/password', requireUser, async (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const user = (req as AuthedRequest).user
  if (!user) return res.status(401).json({ error: 'Sign in again to change your password.' })
  const error = await updatePassword(user.id, password)
  if (error) return res.status(400).json({ error })
  return res.json({ ok: true })
})
