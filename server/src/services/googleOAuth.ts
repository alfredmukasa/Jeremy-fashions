import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Google OAuth 2.0 / OpenID Connect sign-in helpers.
 *
 * These are intentionally free of any `config`/`d1` imports so they can be unit tested
 * without the server's required environment (Stripe/Supabase). The route layer resolves
 * the client id/secret/redirect URI and the HMAC secret and passes them in.
 */

export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

/** The transaction we stash in a signed, http-only cookie between /start and /callback. */
export type OAuthStatePayload = {
  state: string
  verifier: string
  next: string
  exp: number
}

export type GoogleCredentials = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export type GoogleIdentity = {
  sub: string
  email: string
  emailVerified: boolean
  name: string
  picture: string | null
}

function base64url(input: Buffer): string {
  return input.toString('base64url')
}

/** PKCE S256 pair. The verifier stays server-side (in the signed cookie); only the challenge travels to Google. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

export function createStateNonce(): string {
  return base64url(randomBytes(24))
}

/** Only allow same-site path redirects to avoid an open-redirect through `next`. */
export function sanitizeNext(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return '/account'
  return next
}

export function buildGoogleAuthUrl(args: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
  prompt?: string
}): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT)
  url.searchParams.set('client_id', args.clientId)
  url.searchParams.set('redirect_uri', args.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', args.state)
  url.searchParams.set('code_challenge', args.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('include_granted_scopes', 'true')
  if (args.prompt) url.searchParams.set('prompt', args.prompt)
  return url.toString()
}

// --- Signed OAuth state cookie (HMAC-SHA256, same scheme as the session token) --------

export function signOAuthState(payload: OAuthStatePayload, secret: string): string {
  if (!secret) throw new Error('Auth session secret is not configured.')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verifyOAuthState(token: string | undefined, secret: string): OAuthStatePayload | null {
  if (!secret || !token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const actual = Buffer.from(signature)
  const wanted = Buffer.from(expected)
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload
    if (!payload.state || !payload.verifier || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// --- Token exchange + id_token handling ----------------------------------------------

type TokenResponse = { id_token?: string; access_token?: string; error?: string; error_description?: string }

export async function exchangeGoogleCode(
  args: { code: string; verifier: string; credentials: GoogleCredentials },
  fetchImpl: typeof fetch = fetch,
): Promise<{ idToken: string }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    client_id: args.credentials.clientId,
    client_secret: args.credentials.clientSecret,
    redirect_uri: args.credentials.redirectUri,
    code_verifier: args.verifier,
  })
  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const json = (await response.json().catch(() => ({}))) as TokenResponse
  if (!response.ok || !json.id_token) {
    throw new Error(`Google token exchange failed (${response.status}): ${json.error_description || json.error || 'no id_token'}`)
  }
  return { idToken: json.id_token }
}

/**
 * Validate the id_token claims and return the verified identity.
 *
 * The id_token is fetched directly from Google's token endpoint over TLS in the same
 * request we initiated, so — per Google's documentation for the server-side auth-code
 * flow — the JWT signature does not need to be re-verified here; we validate issuer,
 * audience, expiry, and email verification instead.
 */
export function verifyGoogleIdToken(idToken: string, clientId: string): GoogleIdentity {
  const segment = idToken.split('.')[1]
  if (!segment) throw new Error('Malformed Google id_token.')
  let claims: Record<string, unknown>
  try {
    claims = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<string, unknown>
  } catch {
    throw new Error('Could not decode Google id_token.')
  }
  const iss = String(claims.iss ?? '')
  if (iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com') {
    throw new Error('Google id_token has an unexpected issuer.')
  }
  const aud = claims.aud
  const audMatches = Array.isArray(aud) ? aud.includes(clientId) : aud === clientId
  if (!audMatches) throw new Error('Google id_token was issued for a different client.')
  const exp = Number(claims.exp ?? 0)
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Google id_token has expired.')
  }
  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : ''
  if (!email) throw new Error('Google did not return an email address.')
  const emailVerified = claims.email_verified === true || claims.email_verified === 'true'
  if (!emailVerified) throw new Error('This Google account email is not verified.')
  return {
    sub: String(claims.sub ?? ''),
    email,
    emailVerified,
    name: typeof claims.name === 'string' ? claims.name : '',
    picture: typeof claims.picture === 'string' ? claims.picture : null,
  }
}
