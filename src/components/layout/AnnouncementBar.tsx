import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { DEFAULT_TOP_BANNER } from '../../constants/siteContent'
import { useWaitlistMode } from '../../context/WaitlistModeContext'
import { fetchPublicSiteContent } from '../../services/siteContentService'

const MARQUEE_REPEAT_COUNT = 8

function BannerLink({
  href,
  children,
  decorative = false,
}: {
  href: string
  children: ReactNode
  decorative?: boolean
}) {
  const className = 'underline-offset-2 transition hover:underline'
  const isExternal = /^https?:\/\//i.test(href)
  const a11y = decorative ? ({ tabIndex: -1, 'aria-hidden': true } as const) : {}

  if (isExternal) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...a11y}>
        {children}
      </a>
    )
  }

  const to = href.startsWith('/') ? href : `/${href}`
  return (
    <Link to={to} className={className} {...a11y}>
      {children}
    </Link>
  )
}

function AnnouncementCopy({
  text,
  linkHref,
  linkLabel,
  decorative = false,
}: {
  text: string
  linkHref?: string
  linkLabel?: string
  decorative?: boolean
}) {
  return (
    <>
      {text}
      {linkHref && linkLabel ? (
        <>
          {' · '}
          <BannerLink href={linkHref} decorative={decorative}>
            {linkLabel}
          </BannerLink>
        </>
      ) : null}
    </>
  )
}

export function AnnouncementBar() {
  const location = useLocation()
  const { waitlistMode } = useWaitlistMode()
  const siteContentQuery = useQuery({
    queryKey: ['public', 'site-content'],
    queryFn: fetchPublicSiteContent,
    staleTime: 5 * 60 * 1000,
  })

  const topBanner = siteContentQuery.data?.topBanner ?? DEFAULT_TOP_BANNER
  const showPromoBanner = !waitlistMode && topBanner.enabled
  const visible = showPromoBanner && location.pathname !== '/waitlist'

  useEffect(() => {
    const height = visible ? '2rem' : '0px'
    document.documentElement.style.setProperty('--announcement-height', height)
    return () => {
      document.documentElement.style.setProperty('--announcement-height', '0px')
    }
  }, [visible])

  if (!visible) {
    return null
  }

  const renderMarqueeItems = (keyPrefix: string) =>
    Array.from({ length: MARQUEE_REPEAT_COUNT }, (_, index) => (
      <span key={`${keyPrefix}-${index}`} className="announcement-marquee-item">
        <AnnouncementCopy
          text={topBanner.text}
          linkHref={topBanner.linkHref}
          linkLabel={topBanner.linkLabel}
          decorative
        />
      </span>
    ))

  return (
    <div
      className="fixed inset-x-[10px] top-0 z-50 overflow-hidden rounded-t-2xl border border-b-0 border-neutral-200 bg-[#ececec] text-neutral-950"
      style={{ minHeight: 'var(--announcement-height)' }}
    >
      <div className="relative flex h-[var(--announcement-height)] items-center">
        <p className="announcement-accessible text-[9px] font-medium uppercase tracking-[0.14em] text-neutral-950 sm:text-[10px]">
          <AnnouncementCopy
            text={topBanner.text}
            linkHref={topBanner.linkHref}
            linkLabel={topBanner.linkLabel}
          />
        </p>

        <div className="announcement-marquee" aria-hidden="true">
          <div className="announcement-marquee-track">
            <div className="announcement-marquee-group">{renderMarqueeItems('a')}</div>
            <div className="announcement-marquee-group">{renderMarqueeItems('b')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
