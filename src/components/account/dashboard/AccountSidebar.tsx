import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineCog6Tooth,
  HiOutlineHeart,
  HiOutlineMapPin,
  HiOutlineShieldCheck,
  HiOutlineShoppingBag,
  HiOutlineSquares2X2,
} from 'react-icons/hi2'
import { cn } from '../../../utils/cn'
import { type AccountSection, ACCOUNT_SECTION_IDS } from './accountSections'

type AccountNavItem = {
  id: AccountSection
  label: string
  icon: typeof HiOutlineSquares2X2
}

const navItems: AccountNavItem[] = ACCOUNT_SECTION_IDS.map((id) => {
  switch (id) {
    case 'dashboard':
      return { id, label: 'Dashboard', icon: HiOutlineSquares2X2 }
    case 'orders':
      return { id, label: 'My Orders', icon: HiOutlineShoppingBag }
    case 'addresses':
      return { id, label: 'Saved Addresses', icon: HiOutlineMapPin }
    case 'wishlist':
      return { id, label: 'Wishlist', icon: HiOutlineHeart }
    case 'settings':
      return { id, label: 'Account Settings', icon: HiOutlineCog6Tooth }
    case 'security':
      return { id, label: 'Security', icon: HiOutlineShieldCheck }
  }
})

export function AccountSidebar({
  activeSection,
  onSelect,
  onLogout,
}: {
  activeSection: AccountSection
  onSelect: (section: AccountSection) => void
  onLogout: () => void
}) {
  return (
    <aside className="lg:w-72 lg:shrink-0" aria-label="Account navigation">
      <nav aria-label="Account sections" className="lg:hidden">
        <ul className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-[13px] font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950',
                    isActive
                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:text-neutral-950',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </button>
              </li>
            )
          })}
          <li className="shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors duration-300 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
              aria-label="Sign out of your account"
            >
              <HiOutlineArrowRightOnRectangle className="h-4 w-4 shrink-0" aria-hidden />
              Logout
            </button>
          </li>
        </ul>
      </nav>

      <nav
        aria-label="Account sections"
        className="hidden rounded-sm border border-neutral-200 bg-white p-3 shadow-sm lg:sticky lg:top-28 lg:block"
      >
        <AccountSidebarLinks activeSection={activeSection} onSelect={onSelect} onLogout={onLogout} />
      </nav>
    </aside>
  )
}

function AccountSidebarLinks({
  activeSection,
  onSelect,
  onLogout,
}: {
  activeSection: AccountSection
  onSelect: (section: AccountSection) => void
  onLogout: () => void
}) {
  return (
    <ul className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = activeSection === item.id
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950',
                isActive
                  ? 'bg-neutral-950 text-white shadow-sm'
                  : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </button>
          </li>
        )
      })}
      <li className="border-t border-neutral-100 pt-2">
        <button
          type="button"
          onClick={onLogout}
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
