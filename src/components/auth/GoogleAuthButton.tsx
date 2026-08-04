import { useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import toast from 'react-hot-toast'

import { useAuth } from '../../context/AuthContext'
import { friendlyAuthError } from '../../lib/authErrors'
import { isSupabaseConfigured } from '../../lib/supabase'

import { AuthButton } from './AuthButton'

export function GoogleAuthButton({ label = 'Continue with Google' }: { label?: string }) {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured.')
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
    <AuthButton
      type="button"
      variant="outline"
      disabled={busy || !isSupabaseConfigured}
      onClick={() => void handleClick()}
      className="flex items-center justify-center gap-3"
    >
      <FcGoogle className="h-4 w-4 shrink-0" aria-hidden />
      {busy ? 'Redirecting…' : label}
    </AuthButton>
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
