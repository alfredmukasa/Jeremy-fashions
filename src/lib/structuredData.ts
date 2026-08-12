import type { Product } from '../types'
import { SITE_NAME, SITE_URL, absoluteUrl } from './seo'

/** Store currency actually charged at checkout — see `server/src/middleware/validateCheckout.ts` default. */
const STORE_CURRENCY = 'USD'

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/brand/logo.png'),
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  }
}

export type BreadcrumbItem = { name: string; path: string }

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/**
 * Product + Offer structured data built entirely from real catalog fields — never
 * invents reviews, ratings, or availability. `AggregateRating` is intentionally
 * omitted: the catalog has no review/rating-count data behind the raw `rating`
 * number, so there is nothing legitimate to report.
 */
export function productJsonLd(product: Product, path: string) {
  const price = product.salePrice ?? product.price

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    sku: product.sku,
    category: product.category,
    brand: { '@type': 'Brand', name: product.brand || SITE_NAME },
    image: product.images,
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(path),
      priceCurrency: STORE_CURRENCY,
      price: price.toFixed(2),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }
}
