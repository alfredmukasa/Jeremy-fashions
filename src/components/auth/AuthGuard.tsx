import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { AuthLoader } from './AuthLoader'

/**
 * Wrap a single branch when `<Outlet />` is not used.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthLoader className="min-h-[70vh]" />
  }

  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return <>{children}</>
}
