import { motion } from 'framer-motion'

import { products } from '../../data/products'

import { CategoryTiles } from '../../components/home/CategoryTiles'
import { HeroSection } from '../../components/home/HeroSection'
import { LookbookGrid } from '../../components/home/LookbookGrid'
import { NewsletterSection } from '../../components/home/NewsletterSection'
import { ProductShowcase, TrendingStrip } from '../../components/home/ProductShowcase'
import { ROUTES } from '../../constants'

export default function HomePage() {
  const featured = products.filter((p) => p.tags.includes('bestseller'))
  const arrivals = products.filter((p) => p.tags.includes('new'))
  const trending = [...products].sort((a, b) => b.rating - a.rating).slice(0, 6)

  return (
    <div>
      <HeroSection />

      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="border-b border-neutral-200 bg-white py-12"
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.4em] text-neutral-500">
            Free shipping on orders over $250 · Extended returns · Studio concierge
          </p>
        </div>
      </motion.section>

      <ProductShowcase
        eyebrow="Featured"
        title="Objects you wear every day."
        subtitle="A focused capsule of bestsellers — chosen for fabric, finish, and proportion."
        products={featured}
        cta={{ label: 'Shop featured', to: ROUTES.shop }}
      />

      <TrendingStrip products={trending} />

      <ProductShowcase
        eyebrow="New arrivals"
        title="Fresh silhouettes."
        subtitle="Recent additions with the same disciplined palette — designed to layer into your wardrobe."
        products={arrivals.length ? arrivals : products.slice(0, 4)}
        cta={{ label: 'Shop new in', to: `${ROUTES.shop}?tag=new` }}
      />

      <CategoryTiles />

      <section className="relative isolate overflow-hidden bg-neutral-900 py-24 text-white md:py-32">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
          <div className="max-w-xl">
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/70">Promotion</p>
            <h3 className="mt-4 font-serif text-4xl tracking-tight md:text-5xl">Archive sale — select outer layers.</h3>
            <p className="mt-4 text-sm text-white/75">
              Limited time pricing on seasonal shells and leather. Styles as configured; no rain checks.
            </p>
          </div>
        </div>
      </section>

      <NewsletterSection />
      <LookbookGrid />
    </div>
  )
}
