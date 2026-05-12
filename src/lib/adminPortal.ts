/**
 * Staff routes mount when:
 * - `VITE_ADMIN_PORTAL_ENABLED === 'true'` (any environment), or
 * - Vite dev server (`npm run dev`) so local work never requires flipping env flags.
 * Production builds omit admin unless the env flag is set.
 */
export function isAdminPortalMounted(): boolean {
  return import.meta.env.VITE_ADMIN_PORTAL_ENABLED === 'true' || import.meta.env.DEV === true
}

/**
 * Optional non-default URL prefix (e.g. /ops-a8f3c2) so the path is not guessable.
 * Must start with /. Invalid values fall back to /jeremy-admin when the portal is enabled.
 */
export function getAdminBasePath(): string {
  const raw = import.meta.env.VITE_ADMIN_BASE_PATH
  let s =
    typeof raw === 'string' && raw.trim().length > 0 ? raw.trim().replace(/\/+$/, '') : '/jeremy-admin'
  if (!s.startsWith('/')) s = `/${s}`
  if (s === '/' || s === '') s = '/jeremy-admin'
  return s
}
