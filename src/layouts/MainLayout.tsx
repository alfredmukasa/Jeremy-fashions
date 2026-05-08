import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { CartDrawer } from '../components/layout/CartDrawer'
import { Footer } from '../components/layout/Footer'
import { MobileMenu } from '../components/layout/MobileMenu'
import { Navbar } from '../components/layout/Navbar'

export function MainLayout() {
  const location = useLocation()

  return (
    <div className="min-h-svh bg-white text-neutral-900">
      <Navbar />
      <MobileMenu />
      <CartDrawer />
      <main className="pt-28 lg:pt-[4.5rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}
