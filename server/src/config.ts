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
    return 'http://localhost:5173'
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
}
