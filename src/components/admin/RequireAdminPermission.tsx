import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { hasAdminPermission, type AdminPermission } from '../../lib/adminPermissions'
import { useAdminSession } from './AdminSessionContext'

export function RequireAdminPermission({
  permission,
  children,
}: {
  permission: AdminPermission
  children: ReactNode
}) {
  const session = useAdminSession()

  if (!hasAdminPermission(session.user, permission)) {
    return <Navigate to={ROUTES.admin} replace />
  }

  return children
}
