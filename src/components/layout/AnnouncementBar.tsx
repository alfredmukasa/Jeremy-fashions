import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { ROUTES } from '../../constants'
import { useWaitlistMode } from '../../context/WaitlistModeContext'

export function AnnouncementBar() {
  const { waitlistMode } = useWaitlistMode()

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--text-primary)] text-[var(--accent-contrast)]"
      style={{ minHeight: 'var(--announcement-height)' }}
    >
      <div className="mx-auto flex h-[var(--announcement-height)] max-w-[1440px] items-center justify-center px-4 sm:px-6 lg:px-12">
        {waitlistMode ? (
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.32em]">
            A private chapter is opening — join the charter list for first access.
          </p>
        ) : (
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.32em]">
            Complimentary shipping over $250 ·{' '}
            <Link to={ROUTES.shop} className="underline-offset-4 transition hover:underline">
              Shop the collection
            </Link>
          </p>
        )}
      </div>
    </motion.div>
  )
}
