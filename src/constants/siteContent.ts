export const SITE_SETTING_KEY_HERO_SLIDES = 'hero_slides'
export const SITE_SETTING_KEY_FOOTER_SOCIAL = 'footer_social'
export const SITE_SETTING_KEY_TOP_BANNER = 'top_banner'
export const SITE_SETTING_KEY_RETURN_POLICY = 'return_policy'
export const SITE_SETTING_KEY_SHIPPING_INSTRUCTIONS = 'shipping_instructions'
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

export type HeroSlide = {
  src: string
  alt: string
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
  },
  {
    src: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=3840&q=85',
    alt: 'Monochrome outerwear styled for the season',
  },
  {
    src: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=3840&q=85',
    alt: 'Runway-inspired tailoring in motion',
  },
  {
    src: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=3840&q=85',
    alt: 'Dark luxury fashion portrait',
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
