import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineChevronDown,
  HiOutlineClock,
  HiOutlineCog6Tooth,
  HiOutlineHeart,
  HiOutlineMapPin,
  HiOutlineShieldCheck,
  HiOutlineShoppingBag,
  HiOutlineSquares2X2,
} from 'react-icons/hi2'
import { ROUTES } from '../../../constants'
import { cn } from '../../../utils/cn'

type AccountNavItem = {
  id: string
  label: string
  to: string
  end?: boolean
  icon: typeof HiOutlineSquares2X2
}

const navItems: AccountNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', to: ROUTES.account, end: true, icon: HiOutlineSquares2X2 },
  { id: 'orders', label: 'My Orders', to: ROUTES.orders, icon: HiOutlineShoppingBag },
  { id: 'history', label: 'Order History', to: `${ROUTES.account}#order-history`, icon: HiOutlineClock },
  { id: 'addresses', label: 'Saved Addresses', to: ROUTES.profile, icon: HiOutlineMapPin },
  { id: 'wishlist', label: 'Wishlist', to: ROUTES.saved, icon: HiOutlineHeart },
  { id: 'settings', label: 'Account Settings', to: ROUTES.profile, icon: HiOutlineCog6Tooth },
  { id: 'security', label: 'Security', to: ROUTES.forgotPassword, icon: HiOutlineShieldCheck },
]

export function AccountSidebar({ onLogout }: { onLogout: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <aside className="lg:w-72 lg:shrink-0" aria-label="Account navigation">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-sm border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-medium text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 lg:hidden"
        aria-expanded={mobileOpen}
        aria-controls="account-sidebar-panel"
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span>Account menu</span>
        <HiOutlineChevronDown
          className={cn('h-4 w-4 transition-transform duration-300', mobileOpen && 'rotate-180')}
          aria-hidden
        />
      </button>

      <nav
        id="account-sidebar-panel"
        className={cn(
          'mt-3 rounded-sm border border-neutral-200 bg-white p-3 shadow-sm lg:mt-0 lg:block lg:sticky lg:top-28',
          mobileOpen ? 'block' : 'hidden lg:block',
        )}
      >
        <AccountSidebarLinks onNavigate={() => setMobileOpen(false)} onLogout={onLogout} />
      </nav>
    </aside>
  )
}

function AccountSidebarLinks({
  onNavigate,
  onLogout,
}: {
  onNavigate: () => void
  onLogout: () => void
}) {
  return (
    <ul className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <li key={item.id}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-sm px-3 py-3 text-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950',
                  isActive
                    ? 'bg-neutral-950 text-white shadow-sm'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          </li>
        )
      })}
      <li className="border-t border-neutral-100 pt-2">
        <button
          type="button"
          onClick={() => {
            onNavigate()
            onLogout()
          }}
          className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-sm text-neutral-700 transition-colors duration-300 hover:bg-rose-50 hover:text-rose-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
          aria-label="Sign out of your account"
        >
          <HiOutlineArrowRightOnRectangle className="h-4 w-4 shrink-0" aria-hidden />
          Logout
        </button>
      </li>
    </ul>
  )
}
