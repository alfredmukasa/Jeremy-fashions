import { useEffect } from 'react'

import { DEFAULT_META_DESCRIPTION, SITE_NAME, absoluteUrl } from '../../lib/seo'

export type SeoImage = {
  /** Absolute or site-relative URL. Resolved to absolute before being written to the DOM. */
  url: string
  width?: number
  height?: number
  /** Image MIME type, e.g. `image/jpeg`. */
  type?: string
  alt?: string
}

export type SeoProps = {
  /** Page-specific title. Rendered as `${title} — KREWNOX` unless `rawTitle` is set. */
  title: string
  /** Use `title` verbatim with no site-name suffix (for titles that already read as a full brand statement). */
  rawTitle?: boolean
  description?: string
  /** Route path (e.g. `/shop`, `/product/slug`) used to build the canonical URL and `og:url`. */
  path: string
  image?: SeoImage
  type?: 'website' | 'product' | 'article'
  /** Excludes the page from indexing. Use for account/checkout/auth/admin routes — robots.txt alone is not a security or indexing boundary. */
  noindex?: boolean
  /** JSON-LD objects rendered as `<script type="application/ld+json">` tags. */
  structuredData?: Record<string, unknown>[]
}

/** Falls back to the brand mark when a page has no photographic image of its own (e.g. legal pages). */
const DEFAULT_IMAGE: SeoImage = {
  url: absoluteUrl('/brand/logo.png'),
  width: 1024,
  height: 1024,
  type: 'image/png',
  alt: `${SITE_NAME} emblem`,
}

function upsert(selector: string, tagName: 'meta' | 'link', attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = document.createElement(tagName)
    document.head.appendChild(el)
  }
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
}

const setMetaName = (name: string, content: string) => upsert(`meta[name="${name}"]`, 'meta', { name, content })
const setMetaProperty = (property: string, content: string) =>
  upsert(`meta[property="${property}"]`, 'meta', { property, content })
const setLink = (rel: string, href: string) => upsert(`link[rel="${rel}"]`, 'link', { rel, href })

/**
 * Owns the document `<head>` for the currently-mounted route: title, meta description,
 * canonical URL, robots directive, Open Graph tags, Twitter card tags, and JSON-LD
 * structured data. Every public page should render exactly one of these.
 *
 * This is client-side only — sufficient for Google, which renders JavaScript before
 * indexing, but social crawlers (Facebook, Twitter/X, Slack, iMessage, WhatsApp, …)
 * do not execute JavaScript. The homepage and product pages also get an equivalent,
 * server-rendered set of tags for known bot user agents — see
 * `server/src/routes/socialPreview.ts` — which must be kept in sync with the values
 * this component produces for those routes.
 */
export function Seo({
  title,
  rawTitle = false,
  description = DEFAULT_META_DESCRIPTION,
  path,
  image,
  type = 'website',
  noindex = false,
  structuredData,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = rawTitle ? title : `${title} — ${SITE_NAME}`
    document.title = fullTitle

    const url = absoluteUrl(path)
    const img = image ?? DEFAULT_IMAGE

    setMetaName('description', description)
    setMetaName('robots', noindex ? 'noindex, nofollow' : 'index, follow')
    setLink('canonical', url)

    setMetaProperty('og:site_name', SITE_NAME)
    setMetaProperty('og:type', type)
    setMetaProperty('og:title', fullTitle)
    setMetaProperty('og:description', description)
    setMetaProperty('og:url', url)
    setMetaProperty('og:image', absoluteUrl(img.url))
    if (img.width) setMetaProperty('og:image:width', String(img.width))
    if (img.height) setMetaProperty('og:image:height', String(img.height))
    if (img.type) setMetaProperty('og:image:type', img.type)
    if (img.alt) setMetaProperty('og:image:alt', img.alt)

    setMetaName('twitter:card', 'summary_large_image')
    setMetaName('twitter:title', fullTitle)
    setMetaName('twitter:description', description)
    setMetaName('twitter:image', absoluteUrl(img.url))
    if (img.alt) setMetaName('twitter:image:alt', img.alt)

    document.querySelectorAll('script[data-seo-jsonld]').forEach((el) => el.remove())
    for (const entry of structuredData ?? []) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.seoJsonld = 'true'
      script.text = JSON.stringify(entry)
      document.head.appendChild(script)
    }
  }, [title, rawTitle, description, path, image, type, noindex, structuredData])

  return null
}
