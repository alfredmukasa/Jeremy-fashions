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

const THEME_COLUMNS = 'theme_preference, appearance_mode, theme_updated_at'
const THEME_READ_TIMEOUT_MS = 8_000

/** Avoid repeating a select the live schema cannot serve. A missing column was returning 400 and, under load, 504 after ~2.5 minutes. */
let themeColumnsUnavailable = false

function schemaCannotServeTheme(message: string): boolean {
  return /theme_preference|appearance_mode|theme_updated_at|schema cache|could not find the/i.test(message)
}

export async function fetchProfileTheme(userId: string): Promise<ProfileTheme | null> {
  if (!isSupabaseConfigured || !supabase || themeColumnsUnavailable) return null

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(THEME_COLUMNS)
      .eq('id', userId)
      .abortSignal(AbortSignal.timeout(THEME_READ_TIMEOUT_MS))
      .maybeSingle()

    if (error) {
      if (schemaCannotServeTheme(error.message)) themeColumnsUnavailable = true
      return null
    }
    if (!data) return null
    return mapProfileTheme(data as ProfileThemeRow)
  } catch {
    return null
  }
}

export async function updateProfileTheme(userId: string, mode: AppearanceMode): Promise<ProfileTheme> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }

  if (themeColumnsUnavailable) {
    return { themePreference: mode, appearanceMode: mode, themeUpdatedAt: null }
  }

  const now = new Date().toISOString()
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        theme_preference: mode,
        appearance_mode: mode,
        theme_updated_at: now,
      })
      .eq('id', userId)
      .abortSignal(AbortSignal.timeout(THEME_READ_TIMEOUT_MS))
      .select(THEME_COLUMNS)
      .single()

    if (error) {
      if (schemaCannotServeTheme(error.message)) {
        themeColumnsUnavailable = true
        return { themePreference: mode, appearanceMode: mode, themeUpdatedAt: null }
      }
      throw new Error(error.message)
    }
    return mapProfileTheme(data as ProfileThemeRow)
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === 'AbortError' || /abort|timeout/i.test(error.message))
    if (!aborted) throw error
    return { themePreference: mode, appearanceMode: mode, themeUpdatedAt: null }
  }
}
