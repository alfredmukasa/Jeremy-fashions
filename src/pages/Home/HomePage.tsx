import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { useProducts } from '../../hooks/useCatalog'

import { CategoryTiles } from '../../components/home/CategoryTiles'
import { HeroSection } from '../../components/home/HeroSection'
import { LookbookGrid } from '../../components/home/LookbookGrid'
import { NewsletterSection } from '../../components/home/NewsletterSection'
import { ProductShowcase, TrendingStrip } from '../../components/home/ProductShowcase'
import { Button } from '../../components/common/Button'
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

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-6% 0px 0px 0px' }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-[2] isolate bg-[var(--surface-base)] shadow-[0_-32px_64px_-24px_rgba(0,0,0,0.18)]"
      >
        <section className="border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] py-8 md:py-10">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.38em] text-[var(--text-muted)]">
              Extended returns · Studio concierge · Secure checkout
            </p>
          </div>
        </section>

        {error ? (
          <section className="home-section border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]">
            <div className="mx-auto max-w-2xl px-4 text-center">
              <p className="eyebrow">Catalog</p>
              <h3 className="display-serif mt-4 text-3xl text-[var(--text-primary)]">
                We couldn&rsquo;t reach the studio
              </h3>
              <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)]">
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

        <section className="home-section relative isolate overflow-hidden bg-[var(--text-primary)] text-[var(--accent-contrast)]">
          <img
            src="https://cdn.pixabay.com/photo/2016/11/18/17/08/fashion-1835871_1280.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30"
          />
          <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
            <div className="max-w-xl">
              <p className="eyebrow text-white/60">Promotion</p>
              <h3 className="display-serif mt-5 text-[clamp(2rem,4.5vw,3.5rem)]">
                Archive sale — select outer layers.
              </h3>
              <p className="mt-5 text-[15px] leading-relaxed text-white/72">
                Limited time pricing on seasonal shells and leather. Styles as configured; no rain checks.
              </p>
              <Link to={ROUTES.shop} className="mt-10 inline-block">
                <Button
                  variant="inverse"
                  className="border border-transparent bg-white/95 text-[var(--text-primary)] hover:bg-white"
                >
                  Explore the edit
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <NewsletterSection />
        <LookbookGrid />
      </motion.div>
    </div>
  )
}
