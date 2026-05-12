import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from './AuthContext'
import {
  applyAppearanceMode,
  DEFAULT_APPEARANCE,
  readCachedAppearance,
  writeCachedAppearance,
  type AppearanceMode,
} from '../lib/theme'
import { fetchProfileTheme, updateProfileTheme } from '../services/profileService'

type ThemeContextValue = {
  appearanceMode: AppearanceMode
  canPersistTheme: boolean
  themeLoading: boolean
  setAppearanceMode: (mode: AppearanceMode) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>(
    () => readCachedAppearance() ?? DEFAULT_APPEARANCE,
  )
  const [themeLoading, setThemeLoading] = useState(true)

  useEffect(() => {
    applyAppearanceMode(appearanceMode)
  }, [appearanceMode])

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    async function syncTheme() {
      if (!user) {
        setAppearanceModeState(DEFAULT_APPEARANCE)
        writeCachedAppearance(null)
        applyAppearanceMode(DEFAULT_APPEARANCE)
        if (!cancelled) setThemeLoading(false)
        return
      }

      setThemeLoading(true)
      try {
        const profileTheme = await fetchProfileTheme(user.id)
        const next = profileTheme?.appearanceMode ?? readCachedAppearance() ?? DEFAULT_APPEARANCE
        if (!cancelled) {
          setAppearanceModeState(next)
          writeCachedAppearance(next)
          applyAppearanceMode(next)
        }
      } catch {
        const fallback = readCachedAppearance() ?? DEFAULT_APPEARANCE
        if (!cancelled) {
          setAppearanceModeState(fallback)
          applyAppearanceMode(fallback)
        }
      } finally {
        if (!cancelled) setThemeLoading(false)
      }
    }

    void syncTheme()
    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  const setAppearanceMode = useCallback(
    async (mode: AppearanceMode) => {
      if (!user) {
        setAppearanceModeState(DEFAULT_APPEARANCE)
        applyAppearanceMode(DEFAULT_APPEARANCE)
        return
      }

      setAppearanceModeState(mode)
      writeCachedAppearance(mode)
      applyAppearanceMode(mode)

      try {
        await updateProfileTheme(user.id, mode)
      } catch {
        /* keep optimistic UI; profile sync can retry on next visit */
      }
    },
    [user],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      appearanceMode,
      canPersistTheme: Boolean(user),
      themeLoading,
      setAppearanceMode,
    }),
    [appearanceMode, user, themeLoading, setAppearanceMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
