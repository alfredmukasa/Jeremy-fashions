/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_API_BASE_URL?: string
  /** Optional comma-separated emails allowed to use the admin sign-in UI (RLS still requires admin role). */
  readonly VITE_ADMIN_ALLOWED_EMAILS?: string
  /** Must be "true" to register staff routes at all. Omit or false = no admin URLs (visitors get storefront only). */
  readonly VITE_ADMIN_PORTAL_ENABLED?: string
  /** Optional URL prefix for staff UI, e.g. /ops-x7k9. Default /jeremy-admin when portal enabled. */
  readonly VITE_ADMIN_BASE_PATH?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  readonly VITE_PAYMENTS_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
