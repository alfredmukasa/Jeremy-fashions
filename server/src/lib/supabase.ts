import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { config } from '../config.js'

const authOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
}

export const supabaseAnon = createClient(config.supabaseUrl, config.supabaseAnonKey, authOptions)

export const supabaseAdmin: SupabaseClient | null = config.supabaseServiceRoleKey
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, authOptions)
  : null

export function createUserSupabase(accessToken: string) {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    ...authOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this operation.')
  }

  return supabaseAdmin
}
