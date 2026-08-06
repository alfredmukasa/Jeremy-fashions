import { useEffect, type ReactNode } from 'react'

import { Container } from '../../components/layout/Container'

type LegalPageLayoutProps = {
  title: string
  lastUpdated: string
  metaDescription: string
  intro?: ReactNode
  children: ReactNode
}

/**
 * Shared shell for the legal/policy pages (Terms, Privacy, Refund Policy). Keeps
 * heading, "last updated" stamp, and prose styling consistent across all three so
 * they read as one connected set of documents rather than three one-off pages.
 */
export function LegalPageLayout({ title, lastUpdated, metaDescription, intro, children }: LegalPageLayoutProps) {
  useEffect(() => {
    document.title = `${title} — Krewnox`
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', metaDescription)
  }, [title, metaDescription])

  return (
    <div className="bg-[var(--surface-base)] pb-24 pt-14 sm:pt-20">
      <Container className="max-w-3xl">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-[var(--text-muted)]">
          Legal
        </p>
        <h1 className="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">{title}</h1>
        <p className="mt-3 text-xs text-[var(--text-muted)]">Last updated: {lastUpdated}</p>

        {intro ? (
          <div className="mt-8 text-sm leading-relaxed text-[var(--text-secondary)]">{intro}</div>
        ) : null}

        <div
          className={[
            'legal-prose mt-10 space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]',
            '[&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-[var(--text-primary)] [&_h2]:mb-3',
            '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-[0.08em] [&_h3]:text-[var(--text-primary)] [&_h3]:mb-2 [&_h3]:mt-5',
            '[&_p]:mb-3',
            '[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5',
            '[&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
            '[&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[var(--border-strong)] hover:[&_a]:text-[var(--text-primary)]',
            '[&_strong]:text-[var(--text-primary)] [&_strong]:font-semibold',
          ].join(' ')}
        >
          {children}
        </div>
      </Container>
    </div>
  )
}
