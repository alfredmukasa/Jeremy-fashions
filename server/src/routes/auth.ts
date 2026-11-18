import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import { requireUser } from '../middleware/auth.js'
import { config, googleRedirectUri } from '../config.js'
import { getSessionSecret } from '../lib/session.js'
import {
  createPasswordResetToken,
  loginWithPassword,
  registerAccount,
  resetPasswordWithToken,
  updatePassword,
  upsertGoogleUser,
} from '../services/cloudflareAuth.js'
import {
  buildGoogleAuthUrl,
  createPkcePair,
  createStateNonce,
  exchangeGoogleCode,
  sanitizeNext,
  signOAuthState,
  verifyGoogleIdToken,
  verifyOAuthState,
} from '../services/googleOAuth.js'
import { buildResetLink, deliverPasswordResetEmail } from '../services/passwordReset.js'

export const authRouter = Router()

const OAUTH_COOKIE = 'krewnox_oauth'
const OAUTH_COOKIE_PATH = '/api/auth/google'
const OAUTH_STATE_TTL_SECONDS = 10 * 60

function googleConfigured(): boolean {
  return Boolean(config.googleOAuthClientId && config.googleOAuthClientSecret && getSessionSecret())
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim())
  }
  return undefined
}

function authCallbackError(code: string, message: string): string {
  return `/auth/callback?error=${encodeURIComponent(code)}&error_description=${encodeURIComponent(message)}`
}

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

// Lets the client disable sign-in options that are not configured on the server,
// rather than letting a user click through to an error.
authRouter.get('/providers', (_req, res) => {
  res.json({ google: googleConfigured() })
})

// Step 1 of Google sign-in: stash a signed PKCE/state transaction in an http-only
// cookie and bounce the browser to Google's consent screen.
authRouter.get('/google/start', (req, res) => {
  if (!googleConfigured()) {
    return res.redirect(authCallbackError('google_unavailable', 'Google sign-in is not configured yet. Use email and password.'))
  }
  const next = sanitizeNext(typeof req.query.next === 'string' ? req.query.next : '/account')
  const state = createStateNonce()
  const { verifier, challenge } = createPkcePair()
  const cookie = signOAuthState(
    { state, verifier, next, exp: Math.floor(Date.now() / 1000) + OAUTH_STATE_TTL_SECONDS },
    getSessionSecret(),
  )
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https'
  res.cookie(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: OAUTH_STATE_TTL_SECONDS * 1000,
    path: OAUTH_COOKIE_PATH,
  })
  const url = buildGoogleAuthUrl({
    clientId: config.googleOAuthClientId as string,
    redirectUri: googleRedirectUri(),
    state,
    codeChallenge: challenge,
    prompt: 'select_account',
  })
  return res.redirect(url)
})

// Step 2 of Google sign-in: verify state, exchange the code, verify the id_token,
// find-or-create the app_users row, and hand a session token back to the SPA via the
// same hash-fragment path the client already understands.
authRouter.get('/google/callback', async (req, res) => {
  res.clearCookie(OAUTH_COOKIE, { path: OAUTH_COOKIE_PATH })
  if (!googleConfigured()) {
    return res.redirect(authCallbackError('google_unavailable', 'Google sign-in is not configured yet. Use email and password.'))
  }
  if (typeof req.query.error === 'string') {
    return res.redirect(authCallbackError('google_denied', 'Google sign-in was cancelled.'))
  }
  const stateData = verifyOAuthState(readCookie(req.headers.cookie, OAUTH_COOKIE), getSessionSecret())
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const stateParam = typeof req.query.state === 'string' ? req.query.state : ''
  if (!stateData || !code || stateData.state !== stateParam) {
    return res.redirect(authCallbackError('google_state', 'This Google sign-in link has expired. Please try again.'))
  }
  try {
    const { idToken } = await exchangeGoogleCode({
      code,
      verifier: stateData.verifier,
      credentials: {
        clientId: config.googleOAuthClientId as string,
        clientSecret: config.googleOAuthClientSecret as string,
        redirectUri: googleRedirectUri(),
      },
    })
    const identity = verifyGoogleIdToken(idToken, config.googleOAuthClientId as string)
    const { token } = await upsertGoogleUser(identity)
    const next = sanitizeNext(stateData.next)
    const hash = `access_token=${encodeURIComponent(token)}&refresh_token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`
    return res.redirect(`/auth/callback#${hash}`)
  } catch (error) {
    console.error('[auth] google callback failed', error)
    return res.redirect(authCallbackError('google_signin_failed', 'We could not complete Google sign-in. Please try again.'))
  }
})

// Always responds generically so an attacker cannot learn which emails have accounts.
authRouter.post('/password/forgot', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  try {
    const created = await createPasswordResetToken(email)
    if (created) {
      const resetLink = buildResetLink(config.appBaseUrl, created.token)
      const resendApiKey = process.env.RESEND_API_KEY?.trim()
      const resendFrom = process.env.RESEND_FROM_EMAIL?.trim()
      if (resendApiKey && resendFrom) {
        await deliverPasswordResetEmail({ email: created.email, resetLink }, { resendApiKey, resendFrom })
      } else {
        // Graceful degradation: without RESEND_API_KEY / RESEND_FROM_EMAIL no mail is
        // sent. Log the link so the flow is still testable in local development.
        console.warn('[auth] password reset email is not configured; reset link:', resetLink)
      }
    }
  } catch (error) {
    console.error('[auth] password forgot failed', error)
  }
  return res.json({ ok: true })
})

authRouter.post('/password/reset', async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!token || !password) return res.status(400).json({ error: 'A reset token and new password are required.' })
  const error = await resetPasswordWithToken(token, password)
  if (error) return res.status(400).json({ error })
  return res.json({ ok: true })
})
