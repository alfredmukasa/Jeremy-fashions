import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'

import { DEFAULT_TOP_BANNER } from '../../constants/siteContent'
import { useWaitlistMode } from '../../context/WaitlistModeContext'
import { fetchPublicSiteContent } from '../../services/siteContentService'

function BannerLink({ href, children }: { href: string; children: ReactNode }) {
  const className = 'underline-offset-2 transition hover:underline'
  const isExternal = /^https?:\/\//i.test(href)

  if (isExternal) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }

  const to = href.startsWith('/') ? href : `/${href}`
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
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

  return (
    <motion.div
      className="fixed inset-x-[10px] top-0 z-50 overflow-hidden rounded-t-2xl border border-b-0 border-neutral-200 bg-[#ececec] text-neutral-950"
      style={{ minHeight: 'var(--announcement-height)' }}
    >
      <motion.div className="mx-auto flex h-[var(--announcement-height)] max-w-[1440px] items-center justify-center px-4 sm:px-6 lg:px-12">
        <p className="text-center text-[9px] font-medium uppercase tracking-[0.14em] text-neutral-950 sm:text-[10px]">
          {topBanner.text}
          {topBanner.linkHref && topBanner.linkLabel ? (
            <>
              {' · '}
              <BannerLink href={topBanner.linkHref}>{topBanner.linkLabel}</BannerLink>
            </>
          ) : null}
        </p>
      </motion.div>
    </motion.div>
  )
}
