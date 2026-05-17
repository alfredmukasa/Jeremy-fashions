import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import {
  DEFAULT_FOOTER_SOCIAL_LINKS,
  DEFAULT_HERO_SLIDES,
  FOOTER_SOCIAL_ICON_OPTIONS,
  SITE_SETTING_KEY_FOOTER_SOCIAL,
  SITE_SETTING_KEY_HERO_SLIDES,
  type FooterSocialLink,
  type HeroSlide,
} from '../../constants/siteContent'
import { adminGetSiteSettings, adminUpsertSiteSetting } from '../../services/adminService'
import { uploadProductImageFiles } from '../../services/productImageService'
import { footerSocialPayload, heroSlidesPayload } from '../../services/siteContentService'

function parseHeroFromSettings(raw: Record<string, unknown> | undefined): HeroSlide[] {
  const value = raw?.[SITE_SETTING_KEY_HERO_SLIDES]
  if (!value || typeof value !== 'object') return [...DEFAULT_HERO_SLIDES]
  const slides = (value as { slides?: unknown }).slides
  if (!Array.isArray(slides) || slides.length === 0) return [...DEFAULT_HERO_SLIDES]
  const parsed: HeroSlide[] = []
  for (const item of slides) {
    if (!item || typeof item !== 'object') continue
    const src = (item as { src?: unknown }).src
    const alt = (item as { alt?: unknown }).alt
    if (typeof src === 'string' && src.trim()) {
      parsed.push({
        src: src.trim(),
        alt: typeof alt === 'string' ? alt : '',
      })
    }
  }
  return parsed.length > 0 ? parsed : [...DEFAULT_HERO_SLIDES]
}

function parseSocialFromSettings(raw: Record<string, unknown> | undefined): FooterSocialLink[] {
  const value = raw?.[SITE_SETTING_KEY_FOOTER_SOCIAL]
  if (!value || typeof value !== 'object') return [...DEFAULT_FOOTER_SOCIAL_LINKS]
  const links = (value as { links?: unknown }).links
  if (!Array.isArray(links) || links.length === 0) return [...DEFAULT_FOOTER_SOCIAL_LINKS]
  const parsed: FooterSocialLink[] = []
  for (const item of links) {
    if (!item || typeof item !== 'object') continue
    const href = (item as { href?: unknown }).href
    const label = (item as { label?: unknown }).label
    const icon = (item as { icon?: unknown }).icon
    if (typeof href === 'string' && typeof label === 'string') {
      parsed.push({
        href,
        label,
        icon:
          icon === 'whatsapp' || icon === 'instagram' || icon === 'tiktok' || icon === 'pinterest'
            ? icon
            : 'instagram',
      })
    }
  }
  return parsed.length > 0 ? parsed : [...DEFAULT_FOOTER_SOCIAL_LINKS]
}

export default function AdminSiteContentPage() {
  return (
    <RequireAdminPermission permission="site_content.manage">
      <AdminSiteContentContent />
    </RequireAdminPermission>
  )
}

function AdminSiteContentContent() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminGetSiteSettings })

  const persistedHero = useMemo(
    () => parseHeroFromSettings(settingsQuery.data),
    [settingsQuery.data],
  )
  const persistedSocial = useMemo(
    () => parseSocialFromSettings(settingsQuery.data),
    [settingsQuery.data],
  )

  const [heroDraft, setHeroDraft] = useState<HeroSlide[] | null>(null)
  const [socialDraft, setSocialDraft] = useState<FooterSocialLink[] | null>(null)

  const heroSlides = heroDraft ?? persistedHero
  const socialLinks = socialDraft ?? persistedSocial

  const saveHeroMutation = useMutation({
    mutationFn: () =>
      adminUpsertSiteSetting(SITE_SETTING_KEY_HERO_SLIDES, heroSlidesPayload(heroSlides)),
    onSuccess: () => {
      toast.success('Hero slides saved')
      setHeroDraft(null)
      void invalidateSiteContent(queryClient)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  })

  const saveSocialMutation = useMutation({
    mutationFn: () =>
      adminUpsertSiteSetting(SITE_SETTING_KEY_FOOTER_SOCIAL, footerSocialPayload(socialLinks)),
    onSuccess: () => {
      toast.success('Social links saved')
      setSocialDraft(null)
      void invalidateSiteContent(queryClient)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  })

  const resetHeroMutation = useMutation({
    mutationFn: () =>
      adminUpsertSiteSetting(
        SITE_SETTING_KEY_HERO_SLIDES,
        heroSlidesPayload([...DEFAULT_HERO_SLIDES]),
      ),
    onSuccess: () => {
      toast.success('Hero reset to defaults')
      setHeroDraft(null)
      void invalidateSiteContent(queryClient)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Reset failed'),
  })

  const resetSocialMutation = useMutation({
    mutationFn: () =>
      adminUpsertSiteSetting(
        SITE_SETTING_KEY_FOOTER_SOCIAL,
        footerSocialPayload([...DEFAULT_FOOTER_SOCIAL_LINKS]),
      ),
    onSuccess: () => {
      toast.success('Social links reset to defaults')
      setSocialDraft(null)
      void invalidateSiteContent(queryClient)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Reset failed'),
  })

  function updateHero(next: HeroSlide[]) {
    setHeroDraft(next)
  }

  function updateSocial(next: FooterSocialLink[]) {
    setSocialDraft(next)
  }

  return (
    <div className="space-y-10">
      <AdminPageHeader
        eyebrow="Storefront"
        title="Site content"
        description="Hero backgrounds and footer social links. Layout on the live site stays unchanged."
      />

      <HeroSlidesEditor
        slides={heroSlides}
        onChange={updateHero}
        onSave={() => saveHeroMutation.mutate()}
        onReset={() => resetHeroMutation.mutate()}
        saving={saveHeroMutation.isPending}
        resetting={resetHeroMutation.isPending}
      />

      <SocialLinksEditor
        links={socialLinks}
        onChange={updateSocial}
        onSave={() => saveSocialMutation.mutate()}
        onReset={() => resetSocialMutation.mutate()}
        saving={saveSocialMutation.isPending}
        resetting={resetSocialMutation.isPending}
      />
    </div>
  )
}

function invalidateSiteContent(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
  void queryClient.invalidateQueries({ queryKey: ['public', 'site-content'] })
}

function HeroSlidesEditor({
  slides,
  onChange,
  onSave,
  onReset,
  saving,
  resetting,
}: {
  slides: HeroSlide[]
  onChange: (slides: HeroSlide[]) => void
  onSave: () => void
  onReset: () => void
  saving: boolean
  resetting: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadIndex, setUploadIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)

  async function uploadForIndex(index: number, files: FileList | null) {
    if (!files?.[0]) return
    setUploading(true)
    try {
      const [url] = await uploadProductImageFiles(`site-hero/${crypto.randomUUID()}`, [files[0]])
      const next = slides.map((slide, i) => (i === index ? { ...slide, src: url } : slide))
      onChange(next)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setUploadIndex(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= slides.length) return
    const next = [...slides]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next)
  }

  return (
    <section className="space-y-4 border border-neutral-200 bg-white p-6">
      <div>
        <h2 className="font-serif text-xl text-neutral-900">Hero backgrounds</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Slides rotate on the home page. Leave empty in Supabase to use built-in defaults.
        </p>
      </div>

      <div className="space-y-6">
        {slides.map((slide, index) => (
          <div key={`${index}-${slide.src}`} className="grid gap-4 border border-neutral-100 p-4 md:grid-cols-[120px_1fr]">
            <div className="aspect-[4/5] overflow-hidden bg-neutral-100">
              {slide.src ? (
                <img src={slide.src} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-400">No image</div>
              )}
            </div>
            <div className="grid gap-3">
              <div>
                <FieldLabel id={`hero-src-${index}`}>Image URL</FieldLabel>
                <Input
                  id={`hero-src-${index}`}
                  value={slide.src}
                  onChange={(e) => {
                    const next = [...slides]
                    next[index] = { ...slide, src: e.target.value }
                    onChange(next)
                  }}
                  placeholder="https://…"
                />
              </div>
              <div>
                <FieldLabel id={`hero-alt-${index}`}>Alt text</FieldLabel>
                <Input
                  id={`hero-alt-${index}`}
                  value={slide.alt}
                  onChange={(e) => {
                    const next = [...slides]
                    next[index] = { ...slide, alt: e.target.value }
                    onChange(next)
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="px-3 py-2 text-xs"
                  disabled={uploading}
                  onClick={() => {
                    setUploadIndex(index)
                    fileRef.current?.click()
                  }}
                >
                  Upload image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="px-3 py-2 text-xs"
                  disabled={index === 0}
                  onClick={() => moveSlide(index, -1)}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="px-3 py-2 text-xs"
                  disabled={index === slides.length - 1}
                  onClick={() => moveSlide(index, 1)}
                >
                  Move down
                </Button>
                {slides.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-2 text-xs"
                    onClick={() => onChange(slides.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          if (uploadIndex !== null) void uploadForIndex(uploadIndex, e.target.files)
        }}
      />

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...slides, { src: '', alt: 'Hero background' }])}
        >
          Add slide
        </Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save hero'}
        </Button>
        <Button type="button" variant="outline" onClick={onReset} disabled={resetting}>
          Reset to defaults
        </Button>
      </div>
    </section>
  )
}

function SocialLinksEditor({
  links,
  onChange,
  onSave,
  onReset,
  saving,
  resetting,
}: {
  links: FooterSocialLink[]
  onChange: (links: FooterSocialLink[]) => void
  onSave: () => void
  onReset: () => void
  saving: boolean
  resetting: boolean
}) {
  return (
    <section className="space-y-4 border border-neutral-200 bg-white p-6">
      <div>
        <h2 className="font-serif text-xl text-neutral-900">Footer social links</h2>
        <p className="mt-1 text-sm text-neutral-600">Shown in the site footer. Icon set matches the current design.</p>
      </div>

      <div className="overflow-x-auto border border-neutral-100">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Icon</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link, index) => (
              <tr key={index} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  <Input
                    value={link.label}
                    onChange={(e) => {
                      const next = [...links]
                      next[index] = { ...link, label: e.target.value }
                      onChange(next)
                    }}
                    aria-label={`Label ${index + 1}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    value={link.href}
                    onChange={(e) => {
                      const next = [...links]
                      next[index] = { ...link, href: e.target.value }
                      onChange(next)
                    }}
                    aria-label={`URL ${index + 1}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={link.icon}
                    onChange={(e) => {
                      const next = [...links]
                      next[index] = {
                        ...link,
                        icon: e.target.value as FooterSocialLink['icon'],
                      }
                      onChange(next)
                    }}
                    className="w-full border border-neutral-200 bg-white px-3 py-2 text-sm"
                  >
                    {FOOTER_SOCIAL_ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-2 text-xs"
                    disabled={links.length <= 1}
                    onClick={() => onChange(links.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange([...links, { href: 'https://', label: 'New link', icon: 'instagram' }])
          }
        >
          Add link
        </Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save social links'}
        </Button>
        <Button type="button" variant="outline" onClick={onReset} disabled={resetting}>
          Reset to defaults
        </Button>
      </div>
    </section>
  )
}
