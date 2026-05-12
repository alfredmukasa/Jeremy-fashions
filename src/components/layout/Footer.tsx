import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaInstagram, FaPinterestP, FaTiktok } from 'react-icons/fa6'

import { BRAND, ROUTES } from '../../constants'
import { Button } from '../common/Button'
import { Input } from '../common/Input'

import { Container } from './Container'

const cols = [
  {
    title: 'Shop',
    links: [
      { to: ROUTES.shop, label: 'All' },
      { to: `${ROUTES.shop}?category=hoodies`, label: 'Hoodies' },
      { to: `${ROUTES.shop}?category=sneakers`, label: 'Sneakers' },
      { to: `${ROUTES.shop}?tag=new`, label: 'New' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: ROUTES.account, label: 'Account' },
      { to: ROUTES.orders, label: 'Orders' },
      { to: ROUTES.waitlist, label: 'Waitlist' },
      { to: '#', label: 'Shipping' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '#', label: 'About' },
      { to: '#', label: 'Careers' },
      { to: '#', label: 'Press' },
      { to: '#', label: 'Contact' },
    ],
  },
]

const social = [
  { href: 'https://instagram.com', label: 'Instagram', icon: FaInstagram },
  { href: 'https://pinterest.com', label: 'Pinterest', icon: FaPinterestP },
  { href: 'https://tiktok.com', label: 'TikTok', icon: FaTiktok },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <footer className="mt-24 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <Container>
        <div className="grid gap-12 py-16 lg:grid-cols-[1.1fr_1.4fr_1fr]">
          <div>
            <p className="font-serif text-2xl tracking-[0.08em] text-[var(--text-primary)]">{BRAND}</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
              A monochrome study in silhouette and material. Designed for movement, edited for clarity.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8 flex items-center gap-4"
            >
              {social.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="inline-flex h-10 w-10 items-center justify-center border border-[var(--border-subtle)] text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </motion.div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {cols.map((c) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  {c.title}
                </p>
                <ul className="mt-4 space-y-2">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Newsletter
            </p>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Private drops and studio notes — sent sparingly.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
              <Button type="submit" className="w-full">
                {sent ? 'Subscribed' : 'Join the list'}
              </Button>
              {sent ? <p className="text-xs text-emerald-600 dark:text-emerald-300">Thank you — this is a UI demo only.</p> : null}
            </form>
          </motion.div>
        </div>
        <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] py-8 text-xs text-[var(--text-muted)] md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND}. All rights reserved.
          </p>
          <p>Frontend demo — no real transactions.</p>
        </div>
      </Container>
    </footer>
  )
}
