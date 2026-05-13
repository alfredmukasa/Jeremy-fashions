import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { ROUTES } from '../../constants'
import { Button } from '../common/Button'
import { Container } from '../layout/Container'

const HERO_SLIDES = [
  {
    src: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=3840&q=85',
    alt: 'Editorial fashion in a luxury retail setting',
  },
  {
    src: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=3840&q=85',
    alt: 'Monochrome outerwear styled for the season',
  },
  {
    src: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=3840&q=85',
    alt: 'Runway-inspired tailoring in motion',
  },
  {
    src: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=3840&q=85',
    alt: 'Dark luxury fashion portrait',
  },
] as const

const SLIDE_MS = 5200

export function HeroSection() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_SLIDES.length)
    }, SLIDE_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const next = HERO_SLIDES[(index + 1) % HERO_SLIDES.length]
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = next.src
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [index])

  const active = HERO_SLIDES[index]

  return (
    <section className="relative isolate -mt-[calc(var(--header-offset)+var(--announcement-height)+1.25rem)] min-h-svh overflow-hidden bg-neutral-950 text-white lg:-mt-[calc(var(--header-offset)+var(--announcement-height))]">
      <div className="absolute inset-0" aria-hidden>
        <AnimatePresence mode="sync">
          <motion.div
            key={active.src}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <img
              src={active.src}
              alt=""
              className="h-full w-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25"
        initial={false}
        animate={{ opacity: 1 }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_55%)]"
        initial={false}
        animate={{ opacity: 1 }}
      />

      <Container className="relative flex min-h-svh flex-col justify-end pb-20 pt-32 md:pb-28">
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
          Tailored outer layers, sculptural sneakers, and studio-grade essentials — designed as a system,
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
            <Button
              variant="ghost"
              className="min-w-[160px] border border-white/30 bg-transparent text-white hover:bg-white hover:text-neutral-950"
            >
              View new arrivals
            </Button>
          </Link>
        </motion.div>

        <div className="mt-12 flex items-center gap-3" aria-hidden>
          {HERO_SLIDES.map((slide, slideIndex) => (
            <span
              key={slide.src}
              className={`h-px transition-all duration-500 ${
                slideIndex === index ? 'w-10 bg-white' : 'w-6 bg-white/35'
              }`}
            />
          ))}
        </div>
      </Container>
    </section>
  )
}
