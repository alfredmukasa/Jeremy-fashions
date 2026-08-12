import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'

import { useProducts } from '../../hooks/useCatalog'
import { fetchPublicSiteContent } from '../../services/siteContentService'
import { DEFAULT_HERO_SLIDES } from '../../constants/siteContent'
import { organizationJsonLd, websiteJsonLd } from '../../lib/structuredData'

import { HeroSection } from '../../components/home/HeroSection'
import { ProductShowcase } from '../../components/home/ProductShowcase'
import { Seo } from '../../components/seo/Seo'
import { ROUTES } from '../../constants'

const HOME_DESCRIPTION =
  'Shop KREWNOX — tailored outerwear, sculptural sneakers, and studio-grade essentials designed as a system, not a statement. New arrivals dropping weekly.'

export default function HomePage() {
  const { data: products, loading, error } = useProducts()

  // Same query key HeroSection uses, so this shares its cache/fetch instead of duplicating
  // the request — this is also the single source of truth for the hero image the admin picked.
  const siteContentQuery = useQuery({
    queryKey: ['public', 'site-content'],
    queryFn: fetchPublicSiteContent,
    staleTime: 5 * 60 * 1000,
  })

  const heroSlides = siteContentQuery.data?.heroSlides ?? DEFAULT_HERO_SLIDES
  const heroImage = heroSlides[0]

  const structuredData = useMemo(() => [organizationJsonLd(), websiteJsonLd()], [])

  const showLoadingShowcase = loading && (!products || products.length === 0)

  return (
    <div>
      <Seo
        title="KREWNOX — Modern Fashion, Outerwear & Sneakers"
        rawTitle
        description={HOME_DESCRIPTION}
        path="/"
        type="website"
        image={heroImage ? { url: heroImage.src, alt: heroImage.alt, type: 'image/jpeg' } : undefined}
        structuredData={structuredData}
      />
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
