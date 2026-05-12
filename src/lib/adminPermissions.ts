import type { User } from '@supabase/supabase-js'

export const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'PRODUCT_MANAGER',
  'ORDER_MANAGER',
  'CONTENT_MANAGER',
  'SUPPORT_ADMIN',
] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

export type AdminPermission =
  | 'dashboard.view'
  | 'products.manage'
  | 'categories.manage'
  | 'orders.manage'
  | 'waitlist.manage'
  | 'users.manage'
  | 'discounts.manage'
  | 'settings.manage'
  | 'security.view'
  | 'admins.manage'

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  SUPER_ADMIN: [
    'dashboard.view',
    'products.manage',
    'categories.manage',
    'orders.manage',
    'waitlist.manage',
    'users.manage',
    'discounts.manage',
    'settings.manage',
    'security.view',
    'admins.manage',
  ],
  PRODUCT_MANAGER: [
    'dashboard.view',
    'products.manage',
    'categories.manage',
    'discounts.manage',
  ],
  ORDER_MANAGER: ['dashboard.view', 'orders.manage'],
  CONTENT_MANAGER: ['dashboard.view', 'products.manage', 'categories.manage'],
  SUPPORT_ADMIN: ['dashboard.view', 'waitlist.manage', 'users.manage', 'orders.manage'],
}

export function getAdminRole(user: User | null | undefined): AdminRole {
  const raw = user?.app_metadata?.admin_role
  if (typeof raw === 'string' && ADMIN_ROLES.includes(raw as AdminRole)) {
    return raw as AdminRole
  }
  return 'SUPER_ADMIN'
}

export function hasAdminPermission(user: User | null | undefined, permission: AdminPermission): boolean {
  if (!user) return false
  const role = getAdminRole(user)
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function getAdminPermissions(user: User | null | undefined): AdminPermission[] {
  if (!user) return []
  return [...ROLE_PERMISSIONS[getAdminRole(user)]]
}
