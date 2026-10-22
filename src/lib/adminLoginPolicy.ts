export const ADMIN_PASSWORD_MAX_LENGTH = 128
export const ADMIN_LOGIN_MAX_FAILURES = 5
export const ADMIN_LOGIN_LOCKOUT_MS = 15 * 60 * 1000

const ADMIN_OAUTH_KEY = 'krewnox_admin_oauth_return'

/** Preserve staff routing in this tab while using the existing exact callback URL. */
export function rememberAdminOAuthReturn(path: string): boolean {
  try {
    sessionStorage.setItem(
      ADMIN_OAUTH_KEY,
      JSON.stringify({ path, startedAt: Date.now() }),
    )
    return true
  } catch {
    return false
  }
}

export function readAdminOAuthReturn(): string | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_OAUTH_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as { path?: unknown; startedAt?: unknown }
    return typeof value.path === 'string' &&
      typeof value.startedAt === 'number' &&
      value.startedAt <= Date.now() &&
      Date.now() - value.startedAt < 10 * 60 * 1000
      ? value.path
      : null
  } catch {
    return null
  }
}

export function clearAdminOAuthReturn(): void {
  try {
    sessionStorage.removeItem(ADMIN_OAUTH_KEY)
  } catch {
    /* Storage may be blocked. */
  }
}

/** Staff redirects stay inside the configured admin area, including OAuth returns. */
export function adminReturnPath(
  candidate: string | null | undefined,
  base: string,
): string {
  if (
    !candidate ||
    candidate.includes('\\') ||
    Array.from(candidate).some((character) => character.charCodeAt(0) <= 32)
  )
    return base
  if (candidate.split(/[?#]/)[0] === `${base}/login`) return base
  return candidate === base || candidate.startsWith(`${base}/`)
    ? candidate
    : base
}
