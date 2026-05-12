export type AppearanceMode = 'light' | 'dark'

export const DEFAULT_APPEARANCE: AppearanceMode = 'light'
export const THEME_CACHE_KEY = 'jeremy-atelier-appearance'

export function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === 'light' || value === 'dark'
}

export function applyAppearanceMode(mode: AppearanceMode) {
  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode
}

export function readCachedAppearance(): AppearanceMode | null {
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY)
    return isAppearanceMode(raw) ? raw : null
  } catch {
    return null
  }
}

export function writeCachedAppearance(mode: AppearanceMode | null) {
  try {
    if (mode) localStorage.setItem(THEME_CACHE_KEY, mode)
    else localStorage.removeItem(THEME_CACHE_KEY)
  } catch {
    /* ignore storage failures */
  }
}
