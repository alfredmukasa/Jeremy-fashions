import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { ROUTES } from '../../constants'
import type { Product } from '../../types'

import { Container } from '../layout/Container'
import { ProductCard } from '../product/ProductCard'

type Props = {
  title: string
  eyebrow?: string
  subtitle?: string
  products: Product[]
  cta?: { label: string; to: string }
  loading?: boolean
  /** Mertra-style compact header (title + pill CTA only) */
  mertraHeader?: boolean
}

function CardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="aspect-[3/4] skeleton-shimmer bg-neutral-100" />
      <div className="h-3 w-3/4 skeleton-shimmer rounded" />
      <div className="h-3 w-1/3 skeleton-shimmer rounded" />
    </div>
  )
}

function MertraSectionHeader({
  title,
  cta,
}: {
  title: string
  cta?: { label: string; to: string }
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 md:mb-8">
      <h2 className="section-title-mertra">{title}</h2>
      {cta ? (
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <Link to={cta.to} className="btn-view-all-pill shrink-0">
            {cta.label}
          </Link>
        </motion.div>
      ) : null}
    </div>
  )
}

export function ProductShowcase({
  title,
  eyebrow,
  subtitle,
  products,
  cta,
  loading = false,
  mertraHeader = true,
}: Props) {
  const list = products ?? []
  const showSkeleton = loading && list.length === 0
  const ctaLabel = cta?.label ?? 'View all'

  return (
    <section className="home-section">
      <Container>
        {mertraHeader ? (
          <MertraSectionHeader title={title} cta={cta ? { ...cta, label: ctaLabel } : undefined} />
        ) : (
          <motion.div className="mb-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
              <h2 className="display-serif text-[clamp(2rem,4vw,3.25rem)] text-[var(--text-primary)]">{title}</h2>
              {subtitle ? (
                <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--text-secondary)]">{subtitle}</p>
              ) : null}
            </div>
            {cta ? (
              <Link to={cta.to} className="text-link whitespace-nowrap">
                {ctaLabel}
              </Link>
            ) : null}
          </motion.div>
        )}
        <motion.div className="grid grid-cols-2 product-grid-gap md:grid-cols-4">
          {showSkeleton
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
            : list.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-8%' }}
                  transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
        </motion.div>
        {!loading && list.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[var(--text-muted)]">
            New pieces are dropping soon — check back shortly.
          </p>
        ) : null}
      </Container>
    </section>
  )
}

export function TrendingStrip({
  products,
  loading = false,
}: {
  products: Product[]
  loading?: boolean
}) {
  const list = products ?? []
  const showSkeleton = loading && list.length === 0

  return (
    <section className="home-section border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <Container>
        <MertraSectionHeader title="Trending now" cta={{ label: 'View all', to: ROUTES.shop }} />
        <div className="scrollbar-hide flex gap-5 overflow-x-auto pb-2 md:gap-8">
          {showSkeleton
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[44vw] shrink-0 sm:w-[280px]">
                  <CardSkeleton />
                </div>
              ))
            : list.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-[44vw] shrink-0 sm:w-[280px]"
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
        </div>
      </Container>
    </section>
  )
}
