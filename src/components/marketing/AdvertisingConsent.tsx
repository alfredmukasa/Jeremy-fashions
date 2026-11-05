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
  const choose = (allow: boolean) => { setAdvertisingConsent(allow); setOpen(false) }
  return <>
    <button type="button" onClick={() => setOpen(true)} className="mx-auto my-3 text-xs underline">Advertising cookie settings</button>
    {open ? <section aria-label="Advertising cookie preferences" className="fixed bottom-0 left-0 right-0 z-[100] border-t border-neutral-300 bg-white p-5 text-neutral-900 shadow-lg">
      <div className="mx-auto max-w-4xl flex flex-wrap items-center gap-4">
        <p className="flex-1 text-sm">Allow Meta advertising cookies to measure visits, product interactions, and purchases and help personalize ads? You can shop without accepting. <a className="underline" href="/privacy">Privacy policy</a></p>
        <button type="button" className="border border-neutral-900 px-4 py-2 text-sm" onClick={() => choose(false)}>Reject advertising cookies</button>
        <button type="button" className="border border-neutral-900 px-4 py-2 text-sm" onClick={() => choose(true)}>Accept advertising cookies</button>
      </div>
    </section> : null}
  </>
}
