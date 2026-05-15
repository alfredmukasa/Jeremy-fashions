import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { useWaitlistMode } from '../../context/WaitlistModeContext'

function BootScreen() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-neutral-950 px-6 text-center">
      <div className="h-px w-16 bg-white/30" aria-hidden />
      <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.4em] text-white/55">Jeremy Atelier</p>
      <p className="mt-3 text-sm text-white/45">Preparing your experience…</p>
    </div>
  )
}

/**
 * Redirects storefront auth entry routes to the waitlist landing page when waitlist-only mode is active.
 */
export function WaitlistPublicGate({ children }: { children: ReactNode }) {
  const { waitlistMode, ready } = useWaitlistMode()

  if (!ready) {
    return <BootScreen />
  }

  if (waitlistMode) {
    return <Navigate to={ROUTES.waitlist} replace />
  }

  return <>{children}</>
}
