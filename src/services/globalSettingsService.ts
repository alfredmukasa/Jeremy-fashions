import { supabase, isSupabaseConfigured } from '../lib/supabase'

/** Singleton row for storefront-wide flags (see migration `0011_waitlist_mode_global_settings.sql`). */
export const GLOBAL_SETTINGS_ROW_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Reads whether the storefront is in waitlist-only mode.
 * When Supabase is not configured, defaults to false so local development keeps working.
 */
export async function fetchPublicWaitlistMode(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false

  const { data, error } = await supabase
    .from('global_settings')
    .select('waitlist_mode')
    .eq('id', GLOBAL_SETTINGS_ROW_ID)
    .maybeSingle()

  if (error) {
    console.error('[globalSettingsService.fetchPublicWaitlistMode]', error)
    return false
  }

  return Boolean(data?.waitlist_mode)
}
