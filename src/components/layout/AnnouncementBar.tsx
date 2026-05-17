import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { ROUTES } from '../../constants'
import { useWaitlistMode } from '../../context/WaitlistModeContext'

export function AnnouncementBar() {
  const { waitlistMode } = useWaitlistMode()

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200 bg-[#ececec] text-neutral-950"
      style={{ minHeight: 'var(--announcement-height)' }}
    >
      <div className="mx-auto flex h-[var(--announcement-height)] max-w-[1440px] items-center justify-center px-4 sm:px-6 lg:px-12">
        {waitlistMode ? (
          <p className="text-center text-[9px] font-medium uppercase tracking-[0.14em] text-neutral-950 sm:text-[10px]">
            A private chapter is opening — join the charter list for first access.
          </p>
        ) : (
          <p className="text-center text-[9px] font-medium uppercase tracking-[0.14em] text-neutral-950 sm:text-[10px]">
            Free shipping on orders over $250 ·{' '}
            <Link to={ROUTES.shop} className="underline-offset-2 transition hover:underline">
              Shop now
            </Link>
          </p>
        )}
      </div>
    </motion.div>
  )
}
