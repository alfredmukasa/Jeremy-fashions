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
}

export function ProductShowcase({ title, eyebrow, subtitle, products, cta }: Props) {
  return (
    <section className="py-20 md:py-28">
      <Container>
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
          {cta ? (
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <Link
                to={cta.to}
                className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-950 underline-offset-8 hover:underline"
              >
                {cta.label}
              </Link>
            </motion.div>
          ) : null}
        </div>
        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
          {products.slice(0, 4).map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ delay: i * 0.06, duration: 0.45 }}
            >
              <ProductCard product={p} />
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}

export function TrendingStrip({ products }: { products: Product[] }) {
  return (
    <section className="border-y border-neutral-200 bg-neutral-50 py-16 md:py-24">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">
              Trending now
            </p>
            <h3 className="mt-3 font-serif text-3xl tracking-tight text-neutral-950 md:text-4xl">
              Quiet bestsellers
            </h3>
          </div>
          <p className="max-w-md text-sm text-neutral-600">
            Pieces moving fast this week — elevated basics with precise proportions and enduring fabric.
          </p>
        </div>
        <div className="mt-12 flex gap-4 overflow-x-auto pb-2 md:gap-8 [scrollbar-width:none]">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.45 }}
              className="w-[70vw] shrink-0 sm:w-[360px]"
            >
              <ProductCard product={p} />
            </motion.div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to={ROUTES.shop}
            className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-950 underline-offset-8 hover:underline"
          >
            View all products
          </Link>
        </div>
      </Container>
    </section>
  )
}
