import { Navigate, useLocation } from 'react-router-dom'

import { getAdminBasePath } from '../lib/adminPortal'

/**
 * Redirects legacy `/admin` URLs to the configured staff base path (default `/jeremy-admin`).
 */
export function AdminLegacyRedirect() {
  const { pathname, search, hash } = useLocation()
  const base = getAdminBasePath()
  const suffix = pathname.replace(/^\/admin\/?/, '')
  const target = suffix ? `${base}/${suffix.replace(/^\/+/, '')}` : base
  return <Navigate to={`${target}${search}${hash}`} replace />
}
