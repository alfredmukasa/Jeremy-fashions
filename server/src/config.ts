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

export const config = {
  port: Number(process.env.PORT ?? 4242),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  stripeSecretKey: required('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? '',
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
}
