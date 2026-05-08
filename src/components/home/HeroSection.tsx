import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { ROUTES } from '../../constants'
import { Button } from '../common/Button'
import { Container } from '../layout/Container'

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[88svh] overflow-hidden bg-neutral-950 text-white">
      <img
        src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=2000&q=80"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
      <Container className="relative flex min-h-[88svh] flex-col justify-end pb-20 pt-32 md:pb-28">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[11px] font-medium uppercase tracking-[0.45em] text-white/80"
        >
          Season 06 — Monochrome Study
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05 }}
          className="mt-6 max-w-4xl font-serif text-[clamp(2.6rem,6vw,4.75rem)] font-normal leading-[0.95] tracking-tight"
        >
          Silence reads louder than a logo.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="mt-6 max-w-xl text-sm leading-relaxed text-white/80 md:text-base"
        >
          Tailored outer layers, sculptural sneakers, and studio‑grade essentials — designed as a system,
          not a statement.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          className="mt-10 flex flex-wrap gap-4"
        >
          <Link to={ROUTES.shop}>
            <Button variant="inverse" className="min-w-[180px]">
              Shop collection
            </Button>
          </Link>
          <Link to={`${ROUTES.shop}?tag=new`}>
            <Button variant="ghost" className="min-w-[160px] border border-white/30 bg-transparent text-white hover:bg-white hover:text-neutral-950">
              View new arrivals
            </Button>
          </Link>
        </motion.div>
      </Container>
    </section>
  )
}
