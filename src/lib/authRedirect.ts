import { ROUTES } from '../constants'

/** App base path from Vite (e.g. "" or "/store"). */
export function getBasePath(): string {
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return ''
  return base.replace(/\/$/, '')
}

export function getAppOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

/** Absolute URL for Supabase email / OAuth redirects (must be allow-listed in Supabase). */
export function getAuthCallbackUrl(extra?: { next?: string; type?: string }): string {
  const url = new URL(`${getAppOrigin()}${getBasePath()}${ROUTES.authCallback}`)
  if (extra?.next) url.searchParams.set('next', extra.next)
  if (extra?.type) url.searchParams.set('type', extra.type)
  return url.toString()
}

export function getLoginRedirectUrl(params?: Record<string, string>): string {
  const url = new URL(`${getAppOrigin()}${getBasePath()}${ROUTES.login}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  return url.toString()
}

export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return ROUTES.account
  if (next === ROUTES.login || next === ROUTES.register || next === ROUTES.authCallback) {
    return ROUTES.account
  }
  return next
}
