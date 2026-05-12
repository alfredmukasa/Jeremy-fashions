import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ROUTES } from '../constants'
import { useAuth } from '../context/AuthContext'
import { AuthLoader } from '../components/auth/AuthLoader'

/**
 * Nested route guard: use as `<Route element={<ProtectedRoute />}>` with child routes.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthLoader className="min-h-[70vh]" />
  }

  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return <Outlet />
}
