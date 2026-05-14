import { motion } from 'framer-motion'
import { FaInstagram, FaPinterestP, FaTiktok } from 'react-icons/fa6'

import { BRAND } from '../../constants'

import { Container } from './Container'

const social = [
  { href: 'https://instagram.com', label: 'Instagram', icon: FaInstagram },
  { href: 'https://pinterest.com', label: 'Pinterest', icon: FaPinterestP },
  { href: 'https://tiktok.com', label: 'TikTok', icon: FaTiktok },
]

export function Footer() {
  return (
    <footer className="relative z-[2] isolate mt-24 border-t border-[var(--border-subtle)] bg-white dark:bg-[var(--surface-elevated)]">
      <Container>
        <div className="flex flex-col gap-8 py-12 sm:py-14 md:flex-row md:items-end md:justify-between md:gap-12 md:py-16">
          <div className="max-w-md">
            <p className="font-serif text-xl tracking-[0.12em] text-[var(--text-primary)] sm:text-2xl">
              {BRAND}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] sm:mt-4 sm:text-[15px]">
              A monochrome study in silhouette and material. Designed for movement, edited for clarity.
            </p>
          </div>

          <motion.nav
            aria-label="Social media"
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-end gap-3 sm:gap-4 md:shrink-0"
          >
            {social.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-primary)] transition-all duration-300 hover:border-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
              >
                <Icon className="h-[15px] w-[15px]" />
              </a>
            ))}
          </motion.nav>
        </div>
      </Container>
    </footer>
  )
}
