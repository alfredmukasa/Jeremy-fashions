export const ADMIN_PASSWORD_MAX_LENGTH = 128
export const ADMIN_LOGIN_MAX_FAILURES = 5
export const ADMIN_LOGIN_LOCKOUT_MS = 15 * 60 * 1000

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
