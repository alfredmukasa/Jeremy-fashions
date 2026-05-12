import { useMemo } from 'react'
import { motion } from 'framer-motion'

import { useProducts } from '../../hooks/useCatalog'

import { CategoryTiles } from '../../components/home/CategoryTiles'
import { HeroSection } from '../../components/home/HeroSection'
import { LookbookGrid } from '../../components/home/LookbookGrid'
import { NewsletterSection } from '../../components/home/NewsletterSection'
import { ProductShowcase, TrendingStrip } from '../../components/home/ProductShowcase'
import { ROUTES } from '../../constants'

export default function HomePage() {
  const { data: products, loading, error } = useProducts()

  const { featured, arrivals, trending } = useMemo(() => {
    const list = products ?? []
    const feat = list.filter((p) => p.featured || p.tags?.includes('bestseller'))
    const arr = list.filter((p) => p.tags?.includes('new'))
    const trend = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 6)
    return { featured: feat, arrivals: arr, trending: trend }
  }, [products])

  const showLoadingShowcase = loading && (!products || products.length === 0)

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

      {error ? (
        <section className="border-y border-neutral-200 bg-neutral-50 py-16">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Catalog</p>
            <h3 className="mt-3 font-serif text-3xl text-neutral-950">We couldn&rsquo;t reach the studio</h3>
            <p className="mt-4 text-sm text-neutral-600">
              Live inventory is briefly unavailable. Please refresh in a moment.
            </p>
          </div>
        </section>
      ) : null}

      <ProductShowcase
        eyebrow="Featured"
        title="Objects you wear every day."
        subtitle="A focused capsule of bestsellers — chosen for fabric, finish, and proportion."
        products={featured}
        loading={showLoadingShowcase}
        cta={{ label: 'Shop featured', to: ROUTES.shop }}
      />

      <TrendingStrip products={trending} loading={showLoadingShowcase} />

      <ProductShowcase
        eyebrow="New arrivals"
        title="Fresh silhouettes."
        subtitle="Recent additions with the same disciplined palette — designed to layer into your wardrobe."
        products={arrivals.length ? arrivals : (products ?? []).slice(0, 4)}
        loading={showLoadingShowcase}
        cta={{ label: 'Shop new in', to: `${ROUTES.shop}?tag=new` }}
      />

      <CategoryTiles />

      <section className="relative isolate overflow-hidden bg-neutral-900 py-24 text-white md:py-32">
        <img
          src="https://cdn.pixabay.com/photo/2016/11/18/17/08/fashion-1835871_1280.jpg"
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
