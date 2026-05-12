import { NavLink } from 'react-router-dom'
import { FiGrid, FiLayers, FiPackage, FiPercent, FiSettings, FiShield, FiShoppingBag, FiUsers, FiUserCheck } from 'react-icons/fi'

import { ROUTES } from '../../constants'
import { hasAdminPermission, type AdminPermission } from '../../lib/adminPermissions'
import { useAdminSession } from './AdminSessionContext'

type NavItem = {
  to: string
  label: string
  icon: typeof FiGrid
  permission: AdminPermission
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.admin, label: 'Overview', icon: FiGrid, permission: 'dashboard.view' },
  { to: ROUTES.adminProducts, label: 'Products', icon: FiPackage, permission: 'products.manage' },
  { to: ROUTES.adminCategories, label: 'Categories', icon: FiLayers, permission: 'categories.manage' },
  { to: ROUTES.adminOrders, label: 'Orders', icon: FiShoppingBag, permission: 'orders.manage' },
  { to: ROUTES.adminWaitlist, label: 'Waitlist', icon: FiUserCheck, permission: 'waitlist.manage' },
  { to: ROUTES.adminUsers, label: 'Users', icon: FiUsers, permission: 'users.manage' },
  { to: ROUTES.adminDiscounts, label: 'Discounts', icon: FiPercent, permission: 'discounts.manage' },
  { to: ROUTES.adminSettings, label: 'Settings', icon: FiSettings, permission: 'settings.manage' },
  { to: ROUTES.adminSecurity, label: 'Security', icon: FiShield, permission: 'security.view' },
]

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const session = useAdminSession()
  const items = NAV_ITEMS.filter((item) => hasAdminPermission(session.user, item.permission))

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ROUTES.admin}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 border px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${
                isActive
                  ? 'border-white bg-white text-neutral-950'
                  : 'border-transparent text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
