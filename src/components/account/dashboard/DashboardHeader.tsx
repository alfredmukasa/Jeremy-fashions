import { motion } from 'framer-motion'

import { Container } from '../../layout/Container'

export function DashboardHeader({
  userName,
  memberSince,
}: {
  userName: string
  memberSince: string
}) {
  return (
    <div className="border-b border-neutral-200 bg-neutral-50">
      <Container className="py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
        >
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Account</p>
            <h1 className="mt-2 font-serif text-2xl text-neutral-950 sm:text-3xl">{userName}</h1>
          </div>
          {memberSince !== '—' && (
            <p className="text-xs text-neutral-500">Member since {memberSince}</p>
          )}
        </motion.div>
      </Container>
    </div>
  )
}
