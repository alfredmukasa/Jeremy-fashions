import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { useCategories } from '../../hooks/useCatalog'
import { ROUTES } from '../../constants'

import { Container } from '../layout/Container'

export function CategoryTiles() {
  const { data: categories, loading, error } = useCategories()
  const list = categories ?? []
  const showSkeleton = loading && list.length === 0

  return (
    <section className="py-20 md:py-28">
      <Container>
        <div className="mb-12 max-w-2xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Categories</p>
          <h3 className="mt-3 font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">Shop by edit</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {error ? (
            <div className="border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600 md:col-span-3">
              Categories are temporarily unavailable. The rest of the collection can still be browsed from the shop.
            </div>
          ) : showSkeleton
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] animate-pulse rounded bg-neutral-100" />
              ))
            : list.map((c, i) => (
                <motion.div
                  key={c.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.45 }}
                >
                  <Link
                    to={`${ROUTES.shop}?category=${c.slug}`}
                    className="group relative block aspect-[4/5] overflow-hidden bg-neutral-100"
                  >
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                      <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/70">Browse</p>
                      <p className="mt-2 font-serif text-2xl tracking-tight">{c.name}</p>
                      <p className="mt-2 text-sm text-white/75">{c.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
        </div>
      </Container>
    </section>
  )
}
