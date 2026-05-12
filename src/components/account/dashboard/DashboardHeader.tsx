import { motion } from 'framer-motion'

import { Container } from '../../layout/Container'

export function DashboardHeader({
  userName,
  memberSince,
  totalOrders,
}: {
  userName: string
  memberSince: string
  totalOrders: number
}) {
  return (
    <div className="border-b border-neutral-200 bg-neutral-50">
      <Container className="py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Account</p>
          <h1 className="mt-3 font-serif text-3xl text-neutral-950 sm:text-4xl md:text-5xl">
            Welcome back, {userName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 md:text-base">
            Your studio dashboard brings orders, saved addresses, and wishlist pieces into one calm, curated view.
          </p>
          <dl className="mt-8 flex flex-wrap gap-6 text-sm text-neutral-600">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Member since</dt>
              <dd className="mt-1 font-medium text-neutral-900">{memberSince}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Total orders</dt>
              <dd className="mt-1 font-medium text-neutral-900">{totalOrders}</dd>
            </div>
          </dl>
        </motion.div>
      </Container>
    </div>
  )
}
