import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { CartDrawer } from '../components/layout/CartDrawer'
import { AnnouncementBar } from '../components/layout/AnnouncementBar'
import { Footer } from '../components/layout/Footer'
import { MobileMenu } from '../components/layout/MobileMenu'
import { Navbar } from '../components/layout/Navbar'
import { ProductQuickViewModal } from '../components/product/ProductQuickViewModal'
import { ROUTES } from '../constants'
import { cn } from '../utils/cn'

export function MainLayout() {
  const location = useLocation()
  const isHome = location.pathname === ROUTES.home

  // Ensure premium-feeling navigation: don't preserve deep scroll positions between pages.
  // Without this, navigating from a scrolled product grid can land the user "below" the new page content,
  // which looks like a blank white screen until refresh resets scroll.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <motion.div
      className={cn(
        'min-h-svh text-[var(--text-primary)] transition-colors duration-500',
        !isHome && 'bg-[var(--surface-base)]',
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
