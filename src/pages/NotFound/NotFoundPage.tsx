import { Link } from 'react-router-dom'

import { Container } from '../../components/layout/Container'
import { Seo } from '../../components/seo/Seo'
import { ROUTES } from '../../constants'

export default function NotFoundPage() {
  return (
    <div className="bg-[var(--surface-base)] pb-24 pt-16 sm:pt-24">
      <Seo
        title="Page not found"
        description="This page is not available. Continue shopping the KREWNOX collection."
        path="/404"
        noindex
      />
      <Container className="max-w-2xl text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-[var(--text-muted)]">404</p>
        <h1 className="display-serif mt-4 text-4xl text-[var(--text-primary)] sm:text-5xl">Page not found</h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          That address is not part of the store. The collection, your bag, and support are still here.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={ROUTES.shop}
            className="btn-luxury inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--accent-contrast)] hover:opacity-90"
          >
            Shop the collection
          </Link>
          <Link
            to={ROUTES.home}
            className="inline-flex items-center justify-center px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)] underline-offset-4 hover:underline"
          >
            Home
          </Link>
          <Link
            to={ROUTES.contact}
            className="inline-flex items-center justify-center px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)] underline-offset-4 hover:underline"
          >
            Contact
          </Link>
        </div>
      </Container>
    </div>
  )
}
