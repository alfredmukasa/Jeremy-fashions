import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { categories } from '../../data/products'
import { ROUTES } from '../../constants'

import { Container } from '../layout/Container'

const imgs: Record<string, string> = {
  hoodies:
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=80',
  't-shirts':
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  jackets:
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
  sneakers:
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80',
  accessories:
    'https://images.unsplash.com/photo-1548036328-3729c1a12e47?auto=format&fit=crop&w=900&q=80',
}

export function CategoryTiles() {
  return (
    <section className="py-20 md:py-28">
      <Container>
        <div className="mb-12 max-w-2xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Categories</p>
          <h3 className="mt-3 font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">Shop by edit</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {categories.map((c, i) => (
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
                <img
                  src={imgs[c.slug]}
                  alt=""
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                />
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
