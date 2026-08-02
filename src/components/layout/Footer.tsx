import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineChevronUp } from 'react-icons/hi2'

import { DEFAULT_FOOTER_SOCIAL_LINKS } from '../../constants/siteContent'
import { ROUTES } from '../../constants'
import { fetchPublicSiteContent, FOOTER_SOCIAL_ICONS } from '../../services/siteContentService'
import { cn } from '../../utils/cn'

const helpNavLinks = [
  { label: 'Shop all', to: ROUTES.shop },
  { label: 'Contact', to: ROUTES.account },
  { label: 'Terms', to: '#' },
  { label: 'Search', to: `${ROUTES.shop}?focus=search` },
]

function FooterHelp() {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      layout
      className="relative flex min-w-0 justify-end justify-self-end"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--footer-fg)] transition-opacity hover:opacity-65 sm:gap-2 sm:text-[11px] sm:tracking-[0.22em]"
        aria-expanded={open}
      >
        Need help?
        <HiOutlineChevronUp
          className={cn('h-3.5 w-3.5 transition-transform duration-300', !open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full right-0 z-10 mb-3 w-[min(100vw-2rem,280px)] rounded-xl border border-[var(--footer-border)] bg-[var(--footer-bg-elevated)] p-4 shadow-lg md:right-0 md:w-72"
          >
            <ul className="space-y-1">
              {helpNavLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="block py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--footer-fg)] transition-opacity hover:opacity-60"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

export function Footer() {
  const siteContentQuery = useQuery({
    queryKey: ['public', 'site-content'],
    queryFn: fetchPublicSiteContent,
    staleTime: 5 * 60 * 1000,
  })

  const social =
    siteContentQuery.data?.footerSocialLinks ?? [...DEFAULT_FOOTER_SOCIAL_LINKS]

  return (
    <footer className="relative z-[2] isolate mt-20 bg-[var(--surface-base)] md:mt-28">
      <motion.div
        layout
        className="mx-auto max-w-[1440px] border-t border-[var(--border-subtle)] bg-[var(--footer-bg)]"
      >
        <motion.div
          layout
          className="grid grid-cols-2 items-center gap-x-2 gap-y-3 rounded-[var(--footer-radius)] px-3 py-3 text-[var(--footer-fg)] min-[360px]:gap-x-3 min-[360px]:px-4 min-[360px]:py-3.5 sm:px-6 sm:py-3.5 md:gap-4 md:px-10 md:py-4"
        >
          <motion.div
            layout
            className="flex min-w-0 items-center justify-start gap-2.5 sm:gap-3"
          >
            {social.map(({ href, label, icon }) => {
              const Icon = FOOTER_SOCIAL_ICONS[icon] ?? FOOTER_SOCIAL_ICONS.instagram
              return (
                <a
                  key={`${label}-${href}`}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="shrink-0 text-[var(--footer-fg)] transition-opacity hover:opacity-55"
                >
                  <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5" />
                </a>
              )
            })}
          </motion.div>

          <motion.div className="min-w-0 justify-self-end">
            <FooterHelp />
          </motion.div>
        </motion.div>
      </motion.div>
    </footer>
  )
}
