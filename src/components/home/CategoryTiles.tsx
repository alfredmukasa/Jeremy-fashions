import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { useCategories } from '../../hooks/useCatalog'
import { ROUTES } from '../../constants'

import { Container } from '../layout/Container'
import { SectionHeading } from '../common/SectionHeading'

export function CategoryTiles() {
  const { data: categories, loading, error } = useCategories()
  const list = categories ?? []
  const showSkeleton = loading && list.length === 0

  return (
    <section className="home-section">
      <Container>
        <div className="mb-10 max-w-2xl">
          <SectionHeading
            eyebrow="Categories"
            title="Shop by edit"
            subtitle="Curated entry points into the collection — each edit shaped by silhouette, material, and mood."
          />
        </div>
        <div className="grid gap-5 md:grid-cols-3 md:gap-7">
          {error ? (
            <div className="surface-panel p-8 text-sm text-[var(--text-secondary)] md:col-span-3">
              Categories are temporarily unavailable. The rest of the collection can still be browsed from the shop.
            </div>
          ) : showSkeleton
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-muted)]"
                />
              ))
            : list.map((c, i) => (
                <motion.div
                  key={c.slug}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={`${ROUTES.shop}?category=${c.slug}`}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-muted)] shadow-[var(--shadow-soft)] transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]"
                  >
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="image-zoom h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent transition-opacity duration-500 group-hover:from-black/80" />
                    <div className="absolute inset-x-0 bottom-0 p-7 text-white">
                      <p className="eyebrow text-white/65">Browse</p>
                      <p className="display-serif mt-3 text-2xl md:text-3xl">{c.name}</p>
                      <p className="mt-3 text-sm leading-relaxed text-white/75">{c.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
        </div>
      </Container>
    </section>
  )
}
