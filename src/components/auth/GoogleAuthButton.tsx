import { useEffect, useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import toast from 'react-hot-toast'

import { useAuth } from '../../context/AuthContext'
import { friendlyAuthError } from '../../lib/authErrors'
import { clearAdminOAuthReturn } from '../../lib/adminLoginPolicy'

import { AuthButton } from './AuthButton'

const GOOGLE_UNCONFIGURED_MESSAGE =
  'Google sign-in is not configured yet. Use email and password.'

export function GoogleAuthButton({ label = 'Continue with Google' }: { label?: string }) {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  // null = still checking; true/false = whether the server has Google OAuth configured.
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/auth/providers')
      .then((response) => (response.ok ? response.json() : { google: false }))
      .then((data: { google?: boolean }) => {
        if (!cancelled) setAvailable(Boolean(data?.google))
      })
      .catch(() => {
        if (!cancelled) setAvailable(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleClick() {
    clearAdminOAuthReturn()
    if (available === false) {
      toast.error(GOOGLE_UNCONFIGURED_MESSAGE)
      return
    }
    setBusy(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setBusy(false)
      toast.error(friendlyAuthError(error.message))
      return
    }
    // Success hands off to Google's redirect — leave the button in its busy state
    // until the browser navigates away, rather than flashing back to idle.
  }

  return (
    <div className="space-y-2">
      <AuthButton
        type="button"
        variant="outline"
        disabled={busy || available === false}
        onClick={() => void handleClick()}
        className="flex items-center justify-center gap-3"
      >
        <FcGoogle className="h-4 w-4 shrink-0" aria-hidden />
        {busy ? 'Continuing…' : label}
      </AuthButton>
      {available === false ? (
        <p className="text-center text-[11px] text-neutral-500">{GOOGLE_UNCONFIGURED_MESSAGE}</p>
      ) : null}
    </div>
  )
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-600">
      <span className="h-px flex-1 bg-white/10" aria-hidden />
      {label}
      <span className="h-px flex-1 bg-white/10" aria-hidden />
    </div>
  )
}
