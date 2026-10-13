export const SITE_SETTING_KEY_HERO_SLIDES = 'hero_slides'
export const SITE_SETTING_KEY_FOOTER_SOCIAL = 'footer_social'
export const SITE_SETTING_KEY_TOP_BANNER = 'top_banner'
export const SITE_SETTING_KEY_HOME_PRODUCT_HEADER = 'home_product_header'
export const SITE_SETTING_KEY_RETURN_POLICY = 'return_policy'
export const SITE_SETTING_KEY_SHIPPING_INSTRUCTIONS = 'shipping_instructions'
export const SITE_SETTING_KEY_PRIVACY_POLICY = 'privacy_policy'
export const SITE_SETTING_KEY_TERMS = 'terms_of_service'
export const SITE_SETTING_KEY_CONTACT_RECIPIENT = 'contact_recipient'

export const DEFAULT_CONTACT_EMAIL = 'support@krewnox.ca'

export type StorePolicy = {
  title: string
  body: string
  /** True when an admin has saved a non-empty policy in site settings. */
  published: boolean
  updatedAt?: string
}

/** Shown until an admin publishes a return policy. */
export const DEFAULT_RETURN_POLICY: StorePolicy = {
  title: 'Return policy',
  body: 'Unworn pieces may be returned within 30 days. Final sale and altered items are excluded.',
  published: false,
}

/** Shown until an admin publishes shipping instructions. */
export const DEFAULT_SHIPPING_INSTRUCTIONS: StorePolicy = {
  title: 'Shipping',
  body: 'Complimentary standard shipping on orders over $250. Express delivery is available at checkout for domestic addresses.',
  published: false,
}

/** Customers keep the built-in privacy page until an admin publishes a replacement. */
export const DEFAULT_PRIVACY_POLICY: StorePolicy = {
  title: 'Privacy Policy',
  body: '',
  published: false,
}

/** Customers keep the built-in terms page until an admin publishes a replacement. */
export const DEFAULT_TERMS: StorePolicy = {
  title: 'Terms of Service',
  body: '',
  published: false,
}

export type TopBanner = {
  enabled: boolean
  text: string
  linkHref?: string
  linkLabel?: string
}

/** Default announcement bar above the navbar. */
export const DEFAULT_TOP_BANNER: TopBanner = {
  enabled: true,
  text: 'Free shipping on orders over $250',
  linkHref: '/shop',
  linkLabel: 'Shop now',
}

/** Built-in hero headline, used when a slide has no saved title. */
export const DEFAULT_HERO_TITLE = 'Season 06 — Monochrome Study'

/** Built-in hero button label, used when a slide has no saved label. */
export const DEFAULT_HERO_CTA_LABEL = 'Shop collection'

/** Built-in heading on the home page product grid. */
export const DEFAULT_HOME_PRODUCT_TITLE = 'The great restock'

/** Built-in button beside that heading. */
export const DEFAULT_HOME_PRODUCT_CTA_LABEL = 'View all'

export const HOME_PRODUCT_TITLE_MAX = 80
export const HOME_PRODUCT_CTA_MAX = 32

export type HomeProductHeader = {
  /** Grid heading. Blank falls back to the built-in line. */
  title?: string
  /** Button label. Blank falls back to the built-in label. */
  ctaLabel?: string
}

export const DEFAULT_HOME_PRODUCT_HEADER: Required<HomeProductHeader> = {
  title: DEFAULT_HOME_PRODUCT_TITLE,
  ctaLabel: DEFAULT_HOME_PRODUCT_CTA_LABEL,
}

export type HeroSlide = {
  src: string
  alt: string
  /** Overlay headline. Blank falls back to the built-in season line. */
  title?: string
  /** Shop button label. Blank falls back to the built-in label. */
  ctaLabel?: string
}

/** Trimmed plain text, or undefined when the value is missing or blank. */
export function optionalHeroText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function boundedPlainText(value: unknown, max: number): string | undefined {
  const text = optionalHeroText(value)
  if (!text) return undefined
  return text.length > max ? text.slice(0, max).trim() : text
}

/** Heading and button label actually shown above the home product grid. */
export function resolveHomeProductHeader(
  header: HomeProductHeader | null | undefined,
): Required<HomeProductHeader> {
  return {
    title: boundedPlainText(header?.title, HOME_PRODUCT_TITLE_MAX) ?? DEFAULT_HOME_PRODUCT_TITLE,
    ctaLabel: boundedPlainText(header?.ctaLabel, HOME_PRODUCT_CTA_MAX) ?? DEFAULT_HOME_PRODUCT_CTA_LABEL,
  }
}

/** Headline and button label actually shown for a slide. */
export function resolveHeroSlideCopy(
  slide: Pick<HeroSlide, 'title' | 'ctaLabel'> | null | undefined,
): { title: string; ctaLabel: string } {
  return {
    title: optionalHeroText(slide?.title) ?? DEFAULT_HERO_TITLE,
    ctaLabel: optionalHeroText(slide?.ctaLabel) ?? DEFAULT_HERO_CTA_LABEL,
  }
}

export function readHeroSlideText(item: object): Pick<HeroSlide, 'title' | 'ctaLabel'> {
  const title = optionalHeroText((item as { title?: unknown }).title)
  const ctaLabel = optionalHeroText((item as { ctaLabel?: unknown }).ctaLabel)
  return {
    ...(title ? { title } : {}),
    ...(ctaLabel ? { ctaLabel } : {}),
  }
}

export type FooterSocialIconKey = 'whatsapp' | 'instagram' | 'tiktok' | 'pinterest'

export type FooterSocialLink = {
  href: string
  label: string
  icon: FooterSocialIconKey
}

/** Default hero backgrounds (used when Supabase has no override). */
export const DEFAULT_HERO_SLIDES: readonly HeroSlide[] = [
  {
    src: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=3840&q=85',
    alt: 'Editorial fashion in a luxury retail setting',
    title: DEFAULT_HERO_TITLE,
    ctaLabel: DEFAULT_HERO_CTA_LABEL,
  },
  {
    src: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=3840&q=85',
    alt: 'Monochrome outerwear styled for the season',
    title: DEFAULT_HERO_TITLE,
    ctaLabel: DEFAULT_HERO_CTA_LABEL,
  },
  {
    src: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=3840&q=85',
    alt: 'Runway-inspired tailoring in motion',
    title: DEFAULT_HERO_TITLE,
    ctaLabel: DEFAULT_HERO_CTA_LABEL,
  },
  {
    src: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=3840&q=85',
    alt: 'Dark luxury fashion portrait',
    title: DEFAULT_HERO_TITLE,
    ctaLabel: DEFAULT_HERO_CTA_LABEL,
  },
]

/** Default footer social links (used when Supabase has no override). */
export const DEFAULT_FOOTER_SOCIAL_LINKS: readonly FooterSocialLink[] = [
  { href: 'https://wa.me/', label: 'WhatsApp', icon: 'whatsapp' },
  { href: 'https://instagram.com', label: 'Instagram', icon: 'instagram' },
  { href: 'https://tiktok.com', label: 'TikTok', icon: 'tiktok' },
  { href: 'https://pinterest.com', label: 'Pinterest', icon: 'pinterest' },
]

export const FOOTER_SOCIAL_ICON_OPTIONS: { value: FooterSocialIconKey; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'pinterest', label: 'Pinterest' },
]
