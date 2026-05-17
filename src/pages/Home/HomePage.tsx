import { motion } from 'framer-motion'

import { useProducts } from '../../hooks/useCatalog'

import { HeroSection } from '../../components/home/HeroSection'
import { ProductShowcase } from '../../components/home/ProductShowcase'
import { ROUTES } from '../../constants'

export default function HomePage() {
  const { data: products, loading, error } = useProducts()

  const showLoadingShowcase = loading && (!products || products.length === 0)

  return (
    <div>
      <HeroSection />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-6% 0px 0px 0px' }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-[2] -mt-4 isolate mx-[2px] overflow-hidden rounded-t-3xl bg-[var(--surface-base)] shadow-[var(--shadow-lift)] sm:-mt-5 sm:mx-2"
      >
        {error ? (
          <section className="home-section border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]">
            <motion.div className="mx-auto max-w-2xl px-4 text-center">
              <p className="eyebrow">Catalog</p>
              <h3 className="display-serif mt-4 text-3xl text-[var(--text-primary)]">
                We couldn&rsquo;t reach the studio
              </h3>
              <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)]">
                Live inventory is briefly unavailable. Please refresh in a moment.
              </p>
            </motion.div>
          </section>
        ) : null}

        <ProductShowcase
          title="The great restock"
          products={products ?? []}
          loading={showLoadingShowcase}
          cta={{ label: 'View all', to: ROUTES.shop }}
        />
      </motion.div>
    </div>
  )
}
