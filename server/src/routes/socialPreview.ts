import { Router } from 'express'

import { supabaseAnon } from '../lib/supabase.js'

/**
 * Serves pre-rendered, bot-safe HTML with real Open Graph / Twitter Card / JSON-LD tags
 * for the storefront's SPA routes. The main app is a client-rendered React SPA (see
 * src/App.tsx) — Googlebot renders JavaScript before indexing so it's covered by the
 * client-side <Seo> component (src/components/seo/Seo.tsx), but social crawlers
 * (Facebook, Twitter/X, Slack, iMessage, WhatsApp, Discord, LinkedIn, …) fetch raw HTML
 * and never execute JS. `vercel.json` routes requests from those known bot user agents
 * to this endpoint instead of the SPA shell for the routes below; everyone else
 * (real browsers) is completely unaffected and takes the exact same path as before.
 *
 * Values here intentionally mirror what the client-side <Seo> component renders for the
 * same routes — keep them in sync when either changes. Only ever queries the same public,
 * RLS-readable data the storefront itself reads (active products, public site settings) —
 * never anything gated behind authentication.
 */
export const socialPreviewRouter = Router()

const SITE_URL = 'https://krewnox.ca'
const SITE_NAME = 'KREWNOX'
const DEFAULT_DESCRIPTION =
  'KREWNOX is a modern fashion studio for tailored outerwear, sculptural sneakers, and studio-grade essentials — designed as a system, not a statement.'

type MetaImage = {
  url: string
  width?: number
  height?: number
  type?: string
  alt?: string
}

const DEFAULT_IMAGE: MetaImage = {
  url: `${SITE_URL}/brand/logo.png`,
  width: 1024,
  height: 1024,
  type: 'image/png',
  alt: `${SITE_NAME} emblem`,
}

type PageMeta = {
  title: string
  description: string
  path: string
  type?: 'website' | 'product' | 'article'
  image?: MetaImage
  noindex?: boolean
  jsonLd?: Record<string, unknown>[]
}

const adminBase = (process.env.VITE_ADMIN_BASE_PATH?.trim() || '/krewnox-admin').replace(/^\/+|\/+$/g, '')
const PRIVATE_FIRST_SEGMENTS = new Set([
  'cart',
  'checkout',
  'account',
  'orders',
  'profile',
  'saved',
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'auth',
  'admin',
  'krewnox-admin',
  adminBase,
])

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

function renderHtml(meta: PageMeta): string {
  const url = `${SITE_URL}${meta.path}`
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const image = meta.image ?? DEFAULT_IMAGE
  const imageUrl = escapeHtml(image.url)

  const optionalImageTags = [
    image.width ? `<meta property="og:image:width" content="${image.width}" />` : '',
    image.height ? `<meta property="og:image:height" content="${image.height}" />` : '',
    image.type ? `<meta property="og:image:type" content="${escapeHtml(image.type)}" />` : '',
    image.alt ? `<meta property="og:image:alt" content="${escapeHtml(image.alt)}" />` : '',
    image.alt ? `<meta name="twitter:image:alt" content="${escapeHtml(image.alt)}" />` : '',
  ]
    .filter(Boolean)
    .join('\n    ')

  const jsonLdBlocks = (meta.jsonLd ?? [])
    .map(
      (entry) =>
        `<script type="application/ld+json">${JSON.stringify(entry).replace(/</g, '\\u003c')}</script>`,
    )
    .join('\n    ')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${meta.noindex ? 'noindex, nofollow' : 'index, follow'}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="${meta.type ?? 'website'}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${imageUrl}" />
    ${optionalImageTags}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    ${jsonLdBlocks}
  </head>
  <body>
    <h1>${title}</h1>
    <p>${description}</p>
    <a href="${escapeHtml(url)}">Continue to ${SITE_NAME}</a>
  </body>
</html>
`
}

function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo.png`,
  }
}

function websiteJsonLd() {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE_URL }
}

function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

type HeroSlide = { src: string; alt: string }

async function fetchHeroImage(): Promise<HeroSlide | null> {
  const { data, error } = await supabaseAnon
    .from('site_settings')
    .select('value')
    .eq('key', 'hero_slides')
    .maybeSingle()

  if (error || !data) return null

  const slides = (data.value as { slides?: unknown })?.slides
  if (!Array.isArray(slides) || slides.length === 0) return null

  const first = slides[0] as { src?: unknown; alt?: unknown }
  if (typeof first?.src !== 'string' || !first.src.trim()) return null

  return { src: first.src.trim(), alt: typeof first.alt === 'string' && first.alt.trim() ? first.alt.trim() : 'Hero background' }
}

async function homeMeta(): Promise<PageMeta> {
  const hero = await withTimeout(fetchHeroImage(), 4000, null)

  return {
    title: `${SITE_NAME} — Modern Fashion, Outerwear & Sneakers`,
    description:
      'Shop KREWNOX — tailored outerwear, sculptural sneakers, and studio-grade essentials designed as a system, not a statement. New arrivals dropping weekly.',
    path: '/',
    type: 'website',
    image: hero ? { url: hero.src, alt: hero.alt } : undefined,
    jsonLd: [organizationJsonLd(), websiteJsonLd()],
  }
}

type ProductRow = {
  title: string
  slug: string
  description: string | null
  price: number | string
  compare_price: number | string | null
  category: string
  brand: string | null
  stock_quantity: number | null
  image_url: string
  gallery_images: string[] | null
}

async function fetchActiveProductBySlug(slug: string): Promise<ProductRow | null> {
  const { data, error } = await supabaseAnon
    .from('products')
    .select(
      'title, slug, description, price, compare_price, category, brand, stock_quantity, image_url, gallery_images',
    )
    .eq('slug', slug)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as ProductRow
}

async function productMeta(slug: string): Promise<PageMeta | null> {
  const product = await withTimeout(fetchActiveProductBySlug(slug), 4000, null)
  if (!product) return null

  const path = `/product/${product.slug}`
  const price = Number(product.compare_price ?? product.price)
  const images = [product.image_url, ...(product.gallery_images ?? [])].filter(
    (src): src is string => typeof src === 'string' && src.length > 0,
  )
  const inStock = (product.stock_quantity ?? 0) > 0

  return {
    title: product.title,
    description: product.description
      ? product.description.slice(0, 160)
      : `${product.title} — shop the ${product.category.replace('-', ' ')} collection at ${SITE_NAME}.`,
    path,
    type: 'product',
    image: images[0] ? { url: images[0], alt: product.title } : undefined,
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/shop' },
        { name: product.title, path },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.description || undefined,
        category: product.category,
        brand: { '@type': 'Brand', name: product.brand || SITE_NAME },
        image: images,
        offers: {
          '@type': 'Offer',
          url: `${SITE_URL}${path}`,
          priceCurrency: 'USD',
          price: Number.isFinite(price) ? price.toFixed(2) : undefined,
          availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      },
    ],
  }
}

function shopMeta(): PageMeta {
  return {
    title: `Shop All — ${SITE_NAME}`,
    description:
      'Browse the full KREWNOX collection — tailored outerwear, sculptural sneakers, and studio-grade essentials designed as a system.',
    path: '/shop',
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/shop' },
      ]),
    ],
  }
}

function waitlistMeta(): PageMeta {
  return {
    title: `Waitlist — ${SITE_NAME}`,
    description: 'Join the KREWNOX waitlist for early access to new drops and restocks.',
    path: '/waitlist',
  }
}

const LEGAL_PAGES: Record<string, { title: string; description: string }> = {
  '/terms': {
    title: 'Terms of Service',
    description: 'The terms that govern your use of Krewnox and any purchase you make on the site.',
  },
  '/privacy': {
    title: 'Privacy Policy',
    description:
      "What personal data Krewnox collects, how it's used, who it's shared with, and how to request access or deletion.",
  },
  '/refund-policy': {
    title: 'Refund Policy',
    description: "Krewnox's return, exchange, and refund policy — return windows, eligibility, and how refunds are issued.",
  },
}

function legalMeta(path: string): PageMeta {
  const page = LEGAL_PAGES[path]
  return { title: `${page.title} — Krewnox`, description: page.description, path }
}

function genericMeta(path: string, noindex: boolean): PageMeta {
  return { title: `${SITE_NAME} — Modern Fashion, Outerwear & Sneakers`, description: DEFAULT_DESCRIPTION, path, noindex }
}

function normalizePath(rawPath: string): string {
  const withLeadingSlash = `/${rawPath.replace(/^\/+/, '')}`
  if (withLeadingSlash === '/') return '/'
  return withLeadingSlash.replace(/\/+$/, '')
}

/**
 * Builds the full prerendered HTML document for a given storefront route. Shared by the
 * directly-callable `/api/social-preview?path=…` endpoint below (handy for manual
 * `curl`/QA testing) and by the `social-preview-path` query-param middleware mounted
 * globally in app.ts, which is what the bot rewrite in vercel.json actually triggers.
 * Never throws — any lookup failure degrades to safe, generic (but correct) metadata.
 */
export async function renderSocialPreviewHtml(rawPath: string): Promise<string> {
  const path = normalizePath(rawPath)
  const segments = path.split('/').filter(Boolean)

  try {
    if (path === '/') {
      return renderHtml(await homeMeta())
    }

    if (segments[0] === 'product' && segments[1]) {
      const meta = await productMeta(decodeURIComponent(segments[1]))
      return renderHtml(meta ?? genericMeta(path, true))
    }

    if (path === '/shop') {
      return renderHtml(shopMeta())
    }

    if (path === '/waitlist') {
      return renderHtml(waitlistMeta())
    }

    if (LEGAL_PAGES[path]) {
      return renderHtml(legalMeta(path))
    }

    const isPrivate = segments.length > 0 && PRIVATE_FIRST_SEGMENTS.has(segments[0])
    return renderHtml(genericMeta(path, isPrivate))
  } catch (error) {
    console.error('[socialPreview] failed, serving generic fallback', error)
    return renderHtml(genericMeta(path, false))
  }
}

socialPreviewRouter.get('/', async (req, res) => {
  const rawPath = typeof req.query.path === 'string' ? req.query.path : ''
  res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400')
  res.type('html').send(await renderSocialPreviewHtml(rawPath))
})
