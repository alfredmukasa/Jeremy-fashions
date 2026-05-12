import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineXMark } from 'react-icons/hi2'

import { BRAND, ROUTES } from '../../constants'
import { ThemeToggle } from '../common/ThemeToggle'
import { ProductSearchField } from '../search/ProductSearchField'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useUiStore } from '../../store/uiStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

const publicItems = [
  { to: ROUTES.home, label: 'Home' },
  { to: ROUTES.shop, label: 'Shop' },
  { to: `${ROUTES.shop}?tag=new`, label: 'New arrivals' },
  { to: ROUTES.waitlist, label: 'Waitlist' },
]

export function MobileMenu() {
  const open = useUiStore((s) => s.mobileNavOpen)
  const setOpen = useUiStore((s) => s.setMobileNavOpen)
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { canPersistTheme } = useTheme()
  useBodyScrollLock(open)

  const authItems = user
    ? [
        { to: ROUTES.account, label: 'Account' },
        { to: ROUTES.saved, label: 'Saved' },
        { to: ROUTES.orders, label: 'Orders' },
        { to: ROUTES.profile, label: 'Profile' },
      ]
    : [
        { to: ROUTES.login, label: 'Sign In' },
        { to: ROUTES.register, label: 'Register' },
      ]

  const items = [...publicItems, ...authItems]

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[70] flex w-[min(420px,100%)] flex-col bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-2xl md:hidden"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
              <span className="font-serif text-lg tracking-[0.12em]">{BRAND}</span>
              <div className="flex items-center gap-1">
                {canPersistTheme ? <ThemeToggle /> : null}
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="p-2 text-[var(--text-secondary)]"
                >
                  <HiOutlineXMark className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="border-b border-[var(--border-subtle)] px-6 py-4">
              <ProductSearchField placeholder="Search collection" onNavigate={() => setOpen(false)} />
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-8">
              {items.map((it, i) => (
                <motion.div
                  key={`${it.to}-${it.label}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Link
                    to={it.to}
                    onClick={() => setOpen(false)}
                    className="block border-b border-[var(--border-subtle)] py-4 text-[12px] font-medium uppercase tracking-[0.3em] text-[var(--text-primary)]"
                  >
                    {it.label}
                  </Link>
                </motion.div>
              ))}
              {user ? (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * items.length }}
                  className="pt-4"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      void signOut().then(() => navigate(ROUTES.home))
                    }}
                    className="w-full border border-[var(--border-subtle)] py-4 text-[12px] font-medium uppercase tracking-[0.3em] text-[var(--text-primary)]"
                  >
                    Sign out
                  </button>
                </motion.div>
              ) : null}
            </nav>
            <div className="border-t border-[var(--border-subtle)] p-6 text-xs text-[var(--text-muted)]">
              Minimal silhouettes. Neutral palette. Built for the street and the studio.
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
