import { Link } from 'react-router-dom'

import { BRAND, ROUTES } from '../../constants'

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
      { to: ROUTES.checkout, label: 'Orders' },
      { to: '#', label: 'Shipping' },
      { to: '#', label: 'Returns' },
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

export function Footer() {
  return (
    <footer className="mt-24 border-t border-neutral-200 bg-neutral-50">
      <Container>
        <div className="grid gap-12 py-16 md:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="font-serif text-2xl tracking-[0.08em] text-neutral-950">{BRAND}</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-600">
              A monochrome study in silhouette and material. Designed for movement, edited for clarity.
            </p>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">
                  {c.title}
                </p>
                <ul className="mt-4 space-y-2">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="text-sm text-neutral-700 transition hover:text-neutral-950"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-neutral-200 py-8 text-xs text-neutral-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {BRAND}. All rights reserved.</p>
          <p className="text-neutral-400">Frontend demo — no real transactions.</p>
        </div>
      </Container>
    </footer>
  )
}
