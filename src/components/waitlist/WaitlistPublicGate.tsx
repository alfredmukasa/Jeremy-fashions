import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { BrandLogo } from '../common/BrandLogo'
import { useWaitlistMode } from '../../context/WaitlistModeContext'

function BootScreen() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-neutral-950 px-6 text-center">
      <BrandLogo variant="light" size="lg" />
      <p className="text-sm text-white/45">Preparing your experience…</p>
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
