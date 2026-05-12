import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { AppearanceMode } from '../lib/theme'

export type ProfileTheme = {
  themePreference: AppearanceMode
  appearanceMode: AppearanceMode
  themeUpdatedAt: string | null
}

type ProfileThemeRow = {
  theme_preference: AppearanceMode | null
  appearance_mode: AppearanceMode | null
  theme_updated_at: string | null
}

function mapProfileTheme(row: ProfileThemeRow): ProfileTheme {
  const mode = row.appearance_mode ?? row.theme_preference ?? 'light'
  return {
    themePreference: row.theme_preference ?? mode,
    appearanceMode: mode,
    themeUpdatedAt: row.theme_updated_at,
  }
}

export async function fetchProfileTheme(userId: string): Promise<ProfileTheme | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('theme_preference, appearance_mode, theme_updated_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapProfileTheme(data as ProfileThemeRow)
}

export async function updateProfileTheme(userId: string, mode: AppearanceMode): Promise<ProfileTheme> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('profiles')
    .update({
      theme_preference: mode,
      appearance_mode: mode,
      theme_updated_at: now,
    })
    .eq('id', userId)
    .select('theme_preference, appearance_mode, theme_updated_at')
    .single()

  if (error) throw new Error(error.message)
  return mapProfileTheme(data as ProfileThemeRow)
}
