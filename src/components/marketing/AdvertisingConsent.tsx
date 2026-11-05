import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { consentChoice, setAdvertisingConsent, trackMeta } from '../../lib/metaPixel'

export function AdvertisingConsent() {
  const location = useLocation()
  const [open, setOpen] = useState(() => !consentChoice())
  useEffect(() => {
    const page = () => trackMeta('PageView', {}, `page-${location.key}`)
    page()
    window.addEventListener('advertising-consent', page)
    return () => window.removeEventListener('advertising-consent', page)
  }, [location.key, location.pathname])
  const choose = (allow: boolean) => {
    setAdvertisingConsent(allow)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto my-4 min-h-11 px-4 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)] underline decoration-[var(--border-subtle)] underline-offset-4 transition hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Cookie preferences
      </button>
      {open ? (
        <section
          aria-labelledby="cookie-preferences-title"
          aria-describedby="cookie-preferences-description"
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[100] max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] shadow-[0_12px_60px_rgba(0,0,0,0.18)] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[420px]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3 sm:px-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em]">KREWNOX</span>
            <span className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.15em] text-[var(--text-secondary)]">
              <svg aria-hidden="true" width="13" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" />
                <path d="m8.5 12 2.5 2.5 4.5-5" />
              </svg>
              Your privacy
            </span>
          </div>
          <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <h2 id="cookie-preferences-title" className="text-xl font-medium tracking-tight sm:text-2xl">
              A choice that’s yours.
            </h2>
            <p id="cookie-preferences-description" className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              With your permission, Meta cookies help us measure visits and purchases, and show you more relevant ads on Facebook and Instagram.
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
              Shopping works the same if you decline. Change your choice anytime in Cookie preferences.
            </p>
            <a href="/privacy" className="mt-3 inline-flex min-h-8 items-center gap-2 text-[11px] font-medium underline underline-offset-4 transition hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4">
              Read our privacy policy <span aria-hidden="true">↗</span>
            </a>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => choose(false)}
                className="min-h-12 border border-[var(--text-primary)] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.09em] transition hover:bg-[var(--surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => choose(true)}
                className="min-h-12 border border-[var(--text-primary)] bg-[var(--text-primary)] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--surface-base)] transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                Accept cookies
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
