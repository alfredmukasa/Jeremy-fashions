import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'

import { DEFAULT_HERO_SLIDES } from '../../constants/siteContent'
import { ROUTES } from '../../constants'
import { fetchPublicSiteContent } from '../../services/siteContentService'
import { Button } from '../common/Button'
import { Container } from '../layout/Container'

const SLIDE_MS = 6800

export function HeroSection() {
  const siteContentQuery = useQuery({
    queryKey: ['public', 'site-content'],
    queryFn: fetchPublicSiteContent,
    staleTime: 5 * 60 * 1000,
  })

  const heroSlides = useMemo(
    () => siteContentQuery.data?.heroSlides ?? [...DEFAULT_HERO_SLIDES],
    [siteContentQuery.data?.heroSlides],
  )

  const [index, setIndex] = useState(0)
  const { scrollY } = useScroll()
  const bgOpacity = useTransform(scrollY, [0, 400, 800], [1, 0.35, 0])

  const slideIndex = heroSlides.length > 0 ? index % heroSlides.length : 0

  useEffect(() => {
    if (heroSlides.length === 0) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % heroSlides.length)
    }, SLIDE_MS)
    return () => window.clearInterval(id)
  }, [heroSlides])

  useEffect(() => {
    if (heroSlides.length === 0) return
    const next = heroSlides[(slideIndex + 1) % heroSlides.length]
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = next.src
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [slideIndex, heroSlides])

  const active = heroSlides[slideIndex] ?? heroSlides[0]
  if (!active) return null

  return (
    <section className="relative z-[1] isolate -mt-[calc(var(--header-offset)+var(--announcement-height)+1.25rem)] text-white lg:-mt-[calc(var(--header-offset)+var(--announcement-height))]">
      <motion.div
        aria-hidden
        className="pointer-events-none sticky top-0 z-0 -mb-[100svh] h-[100svh] w-full overflow-hidden"
      >
        <motion.div
          style={{ opacity: bgOpacity }}
          className="hero-fixed-bg absolute inset-0 bg-neutral-950"
        >
          <AnimatePresence mode="sync">
            <motion.div
              key={active.src}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <img
                src={active.src}
                alt=""
                className="h-full w-full object-cover"
                loading={slideIndex === 0 ? 'eager' : 'lazy'}
                fetchPriority={slideIndex === 0 ? 'high' : 'auto'}
                decoding="async"
              />
            </motion.div>
          </AnimatePresence>

          <motion.div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
          <motion.div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
          <motion.div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
        </motion.div>
      </motion.div>

      <Container className="relative z-[2] flex min-h-[100svh] flex-col justify-end pb-24 pt-36 md:pb-32">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-[11px] font-medium uppercase tracking-[0.45em] text-white/80"
        >
          Season 06 — Monochrome Study
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
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
          className="mt-10"
        >
          <Link to={ROUTES.shop}>
            <Button variant="inverse" className="min-w-[180px]">
              Shop collection
            </Button>
          </Link>
        </motion.div>

        <motion.div className="mt-12 flex items-center gap-3" aria-hidden>
          {heroSlides.map((slide, i) => (
            <span
              key={`${slide.src}-${i}`}
              className={`h-px transition-all duration-500 ${
                i === slideIndex ? 'w-10 bg-white' : 'w-6 bg-white/35'
              }`}
            />
          ))}
        </motion.div>
      </Container>
    </section>
  )
}
