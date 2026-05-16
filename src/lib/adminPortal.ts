/**
 * Staff routes are included in all builds by default so `/jeremy-admin` works on
 * production and every device. Access is enforced by Supabase Auth + RLS, not by
 * omitting routes from the bundle.
 *
 * Set `VITE_ADMIN_PORTAL_ENABLED=false` only to strip staff routes entirely
 * (e.g. a public demo deployment).
 */
export function isAdminPortalMounted(): boolean {
  return import.meta.env.VITE_ADMIN_PORTAL_ENABLED !== 'false'
}

/**
 * Optional non-default URL prefix (e.g. /ops-a8f3c2) so the path is not guessable.
 * Must start with /. Invalid values fall back to /jeremy-admin.
 */
export function getAdminBasePath(): string {
  const raw = import.meta.env.VITE_ADMIN_BASE_PATH
  let s =
    typeof raw === 'string' && raw.trim().length > 0 ? raw.trim().replace(/\/+$/, '') : '/jeremy-admin'
  if (!s.startsWith('/')) s = `/${s}`
  if (s === '/' || s === '') s = '/jeremy-admin'
  return s
}

/** Full staff sign-in path for bookmarks and external links. */
export function getAdminLoginPath(): string {
  return `${getAdminBasePath()}/login`
}
