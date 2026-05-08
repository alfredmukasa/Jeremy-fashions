import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineXMark } from 'react-icons/hi2'

import { BRAND, ROUTES } from '../../constants'
import { useUiStore } from '../../store/uiStore'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

const items = [
  { to: ROUTES.home, label: 'Home' },
  { to: ROUTES.shop, label: 'Shop' },
  { to: `${ROUTES.shop}?tag=new`, label: 'New arrivals' },
  { to: ROUTES.account, label: 'Account' },
  { to: ROUTES.login, label: 'Sign in' },
]

export function MobileMenu() {
  const open = useUiStore((s) => s.mobileNavOpen)
  const setOpen = useUiStore((s) => s.setMobileNavOpen)
  useBodyScrollLock(open)

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
            className="fixed inset-y-0 right-0 z-[70] flex w-[min(420px,100%)] flex-col bg-white shadow-2xl md:hidden"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
              <span className="font-serif text-lg tracking-[0.12em]">{BRAND}</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="p-2 text-neutral-700"
              >
                <HiOutlineXMark className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-6 py-8">
              {items.map((it, i) => (
                <motion.div
                  key={it.to}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Link
                    to={it.to}
                    onClick={() => setOpen(false)}
                    className="block border-b border-neutral-100 py-4 text-[12px] font-medium uppercase tracking-[0.3em] text-neutral-900"
                  >
                    {it.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="border-t border-neutral-200 p-6 text-xs text-neutral-500">
              Minimal silhouettes. Neutral palette. Built for the street and the studio.
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
