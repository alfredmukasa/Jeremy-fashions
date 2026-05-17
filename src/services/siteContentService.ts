import type { IconType } from 'react-icons'
import { FaInstagram, FaPinterestP, FaTiktok, FaWhatsapp } from 'react-icons/fa6'

import {
  DEFAULT_FOOTER_SOCIAL_LINKS,
  DEFAULT_HERO_SLIDES,
  FOOTER_SOCIAL_ICON_OPTIONS,
  DEFAULT_TOP_BANNER,
  SITE_SETTING_KEY_FOOTER_SOCIAL,
  SITE_SETTING_KEY_HERO_SLIDES,
  SITE_SETTING_KEY_TOP_BANNER,
  type FooterSocialIconKey,
  type FooterSocialLink,
  type HeroSlide,
  type TopBanner,
} from '../constants/siteContent'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type PublicSiteContent = {
  heroSlides: HeroSlide[]
  footerSocialLinks: FooterSocialLink[]
  topBanner: TopBanner
}

const FOOTER_ICON_KEYS = new Set(FOOTER_SOCIAL_ICON_OPTIONS.map((o) => o.value))

export const FOOTER_SOCIAL_ICONS: Record<FooterSocialIconKey, IconType> = {
  whatsapp: FaWhatsapp,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  pinterest: FaPinterestP,
}

function parseHeroSlides(raw: unknown): HeroSlide[] | null {
  if (!raw || typeof raw !== 'object') return null
  const slides = (raw as { slides?: unknown }).slides
  if (!Array.isArray(slides) || slides.length === 0) return null

  const parsed: HeroSlide[] = []
  for (const item of slides) {
    if (!item || typeof item !== 'object') continue
    const src = (item as { src?: unknown }).src
    const alt = (item as { alt?: unknown }).alt
    if (typeof src === 'string' && src.trim()) {
      parsed.push({
        src: src.trim(),
        alt: typeof alt === 'string' && alt.trim() ? alt.trim() : 'Hero background',
      })
    }
  }

  return parsed.length > 0 ? parsed : null
}

function parseFooterSocial(raw: unknown): FooterSocialLink[] | null {
  if (!raw || typeof raw !== 'object') return null
  const links = (raw as { links?: unknown }).links
  if (!Array.isArray(links) || links.length === 0) return null

  const parsed: FooterSocialLink[] = []
  for (const item of links) {
    if (!item || typeof item !== 'object') continue
    const href = (item as { href?: unknown }).href
    const label = (item as { label?: unknown }).label
    const icon = (item as { icon?: unknown }).icon
    if (typeof href === 'string' && href.trim() && typeof label === 'string' && label.trim()) {
      const iconKey =
        typeof icon === 'string' && FOOTER_ICON_KEYS.has(icon as FooterSocialIconKey)
          ? (icon as FooterSocialIconKey)
          : 'instagram'
      parsed.push({ href: href.trim(), label: label.trim(), icon: iconKey })
    }
  }

  return parsed.length > 0 ? parsed : null
}

function parseTopBanner(raw: unknown): TopBanner | null {
  if (!raw || typeof raw !== 'object') return null
  const enabled = (raw as { enabled?: unknown }).enabled
  const text = (raw as { text?: unknown }).text
  const linkHref = (raw as { linkHref?: unknown }).linkHref
  const linkLabel = (raw as { linkLabel?: unknown }).linkLabel

  if (typeof enabled !== 'boolean' || typeof text !== 'string' || !text.trim()) return null

  const banner: TopBanner = {
    enabled,
    text: text.trim(),
  }

  if (typeof linkHref === 'string' && linkHref.trim()) {
    banner.linkHref = linkHref.trim()
    if (typeof linkLabel === 'string' && linkLabel.trim()) {
      banner.linkLabel = linkLabel.trim()
    }
  }

  return banner
}

export async function fetchPublicSiteContent(): Promise<PublicSiteContent> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      heroSlides: [...DEFAULT_HERO_SLIDES],
      footerSocialLinks: [...DEFAULT_FOOTER_SOCIAL_LINKS],
      topBanner: { ...DEFAULT_TOP_BANNER },
    }
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', [
      SITE_SETTING_KEY_HERO_SLIDES,
      SITE_SETTING_KEY_FOOTER_SOCIAL,
      SITE_SETTING_KEY_TOP_BANNER,
    ])

  if (error) {
    console.error('[siteContentService.fetchPublicSiteContent]', error)
    return {
      heroSlides: [...DEFAULT_HERO_SLIDES],
      footerSocialLinks: [...DEFAULT_FOOTER_SOCIAL_LINKS],
      topBanner: { ...DEFAULT_TOP_BANNER },
    }
  }

  let heroSlides: HeroSlide[] | null = null
  let footerSocialLinks: FooterSocialLink[] | null = null
  let topBanner: TopBanner | null = null

  for (const row of data ?? []) {
    if (row.key === SITE_SETTING_KEY_HERO_SLIDES) {
      heroSlides = parseHeroSlides(row.value)
    }
    if (row.key === SITE_SETTING_KEY_FOOTER_SOCIAL) {
      footerSocialLinks = parseFooterSocial(row.value)
    }
    if (row.key === SITE_SETTING_KEY_TOP_BANNER) {
      topBanner = parseTopBanner(row.value)
    }
  }

  return {
    heroSlides: heroSlides ?? [...DEFAULT_HERO_SLIDES],
    footerSocialLinks: footerSocialLinks ?? [...DEFAULT_FOOTER_SOCIAL_LINKS],
    topBanner: topBanner ?? { ...DEFAULT_TOP_BANNER },
  }
}

export function heroSlidesPayload(slides: HeroSlide[]): Record<string, unknown> {
  return { slides }
}

export function footerSocialPayload(links: FooterSocialLink[]): Record<string, unknown> {
  return { links }
}

export function topBannerPayload(banner: TopBanner): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    enabled: banner.enabled,
    text: banner.text.trim(),
  }
  if (banner.linkHref?.trim()) {
    payload.linkHref = banner.linkHref.trim()
    if (banner.linkLabel?.trim()) {
      payload.linkLabel = banner.linkLabel.trim()
    }
  }
  return payload
}
