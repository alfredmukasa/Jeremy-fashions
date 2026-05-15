import { useEffect } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { CartDrawer } from '../components/layout/CartDrawer'
import { AnnouncementBar } from '../components/layout/AnnouncementBar'
import { Footer } from '../components/layout/Footer'
import { MobileMenu } from '../components/layout/MobileMenu'
import { Navbar } from '../components/layout/Navbar'
import { ProductQuickViewModal } from '../components/product/ProductQuickViewModal'
import { ROUTES } from '../constants'
import { useWaitlistMode } from '../context/WaitlistModeContext'
import { cn } from '../utils/cn'

function WaitlistLayoutBoot() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-neutral-950 px-6 text-center">
      <div className="h-px w-16 bg-white/30" aria-hidden />
      <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.4em] text-white/55">Jeremy Atelier</p>
      <p className="mt-3 text-sm text-white/45">Loading…</p>
    </div>
  )
}

export function MainLayout() {
  const location = useLocation()
  const { waitlistMode, ready } = useWaitlistMode()
  const isHome = location.pathname === ROUTES.home
  const isWaitlist = location.pathname === ROUTES.waitlist

  // Ensure premium-feeling navigation: don't preserve deep scroll positions between pages.
  // Without this, navigating from a scrolled product grid can land the user "below" the new page content,
  // which looks like a blank white screen until refresh resets scroll.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  if (!ready) {
    return <WaitlistLayoutBoot />
  }

  if (waitlistMode && !isWaitlist) {
    return <Navigate to={ROUTES.waitlist} replace />
  }

  return (
    <motion.div
      className={cn(
        'min-h-svh text-[var(--text-primary)] transition-colors duration-500',
        !isHome && !isWaitlist && 'bg-[var(--surface-base)]',
        isWaitlist && waitlistMode && 'bg-neutral-950',
      )}
    >
      <AnnouncementBar />
      <Navbar />
      <MobileMenu />
      <CartDrawer />
      <ProductQuickViewModal />
      <main className="pt-[calc(var(--header-offset)+var(--announcement-height)+1.25rem)] lg:pt-[calc(var(--header-offset)+var(--announcement-height))]">
        <AnimatePresence initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </motion.div>
  )
}
