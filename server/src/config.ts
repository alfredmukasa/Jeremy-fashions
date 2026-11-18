import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value && !value.toLowerCase().includes('your-') ? value : undefined
}

function resolveClientOrigins(): string | string[] {
  const explicit =
    process.env.CLIENT_ORIGIN?.split(',').map((value) => value.trim()).filter(Boolean) ?? []
  const vercelUrl = process.env.VERCEL_URL?.trim()
  const vercelOrigin = vercelUrl ? `https://${vercelUrl}` : undefined
  const origins = [...new Set([...explicit, vercelOrigin].filter(Boolean) as string[])]

  if (origins.length === 0) {
    return 'https://krewnox.ca'
  }

  return origins.length === 1 ? origins[0] : origins
}

export const config = {
  port: Number(process.env.PORT ?? 4242),
  clientOrigins: resolveClientOrigins(),
  stripeSecretKey: required('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? '',
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
  cloudflareAccountId: optional('CLOUDFLARE_ACCOUNT_ID'),
  cloudflareApiToken: optional('CLOUDFLARE_API_TOKEN'),
  cloudflareD1DatabaseId: optional('CLOUDFLARE_D1_DATABASE_ID'),
  // Public origin of the storefront. Used for password-reset links and the default
  // Google OAuth redirect URI. PUBLIC_SITE_URL is accepted as an alias of APP_BASE_URL.
  appBaseUrl: (process.env.APP_BASE_URL?.trim() || process.env.PUBLIC_SITE_URL?.trim() || 'https://krewnox.ca').replace(/\/$/, ''),
  // Google OAuth (OpenID Connect) sign-in. All server-only; never prefix with VITE_.
  googleOAuthClientId: optional('GOOGLE_OAUTH_CLIENT_ID'),
  googleOAuthClientSecret: optional('GOOGLE_OAUTH_CLIENT_SECRET'),
  googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || undefined,
}

/** Where Google sends the browser after consent. Must match a registered Authorized redirect URI. */
export function googleRedirectUri(): string {
  return config.googleOAuthRedirectUri || `${config.appBaseUrl}/api/auth/google/callback`
}
