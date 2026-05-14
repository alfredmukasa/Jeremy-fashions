import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { ROUTES } from '../../constants'
import type { Product } from '../../types'

import { Container } from '../layout/Container'
import { SectionHeading } from '../common/SectionHeading'
import { ProductCard } from '../product/ProductCard'

type Props = {
  title: string
  eyebrow?: string
  subtitle?: string
  products: Product[]
  cta?: { label: string; to: string }
  loading?: boolean
}

function CardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="aspect-[3/4] skeleton-shimmer rounded-[var(--radius-card)]" />
      <div className="h-3 w-3/4 skeleton-shimmer rounded" />
      <div className="h-3 w-1/3 skeleton-shimmer rounded" />
    </div>
  )
}

export function ProductShowcase({ title, eyebrow, subtitle, products, cta, loading = false }: Props) {
  const list = products ?? []
  const showSkeleton = loading && list.length === 0

  return (
    <section className="home-section">
      <Container>
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
          {cta ? (
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <Link to={cta.to} className="text-link whitespace-nowrap">
                {cta.label}
              </Link>
            </motion.div>
          ) : null}
        </div>
        <div className="mt-10 grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-4 md:gap-8">
          {showSkeleton
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            : list.slice(0, 4).map((p, i) => (
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
        </div>
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
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">Trending now</p>
            <h3 className="display-serif mt-3 text-3xl text-[var(--text-primary)] md:text-4xl">
              Quiet bestsellers
            </h3>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
            Pieces moving fast this week — elevated basics with precise proportions and enduring fabric.
          </p>
        </div>
        <div className="scrollbar-hide mt-12 flex gap-5 overflow-x-auto pb-2 md:gap-8">
          {showSkeleton
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[70vw] shrink-0 sm:w-[320px]">
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
                  className="w-[70vw] shrink-0 sm:w-[320px]"
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
        </div>
        <div className="mt-10 text-center">
          <Link to={ROUTES.shop} className="text-link">
            View all products
          </Link>
        </div>
      </Container>
    </section>
  )
}
