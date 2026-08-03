import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { friendlyAuthError } from '../../lib/authErrors'
import { isSupabaseConfigured } from '../../lib/supabase'
import { MIN_PASSWORD, validatePassword } from '../../utils/passwordValidation'

import { AuthButton } from '../../components/auth/AuthButton'
import { AuthInput } from '../../components/auth/AuthInput'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { AuthLoader } from '../../components/auth/AuthLoader'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { user, loading, signOut, updatePassword } = useAuth()
  const [busy, setBusy] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldError(null)

    const fd = new FormData(e.currentTarget)
    const password = String(fd.get('password') ?? '')
    const confirm = String(fd.get('confirm') ?? '')

    if (password !== confirm) {
      setFieldError('Passwords do not match.')
      return
    }
    const pwErr = validatePassword(password)
    if (pwErr) {
      setFieldError(pwErr)
      return
    }

    setBusy(true)
    const { error } = await updatePassword(password)
    if (error) {
      setBusy(false)
      toast.error(friendlyAuthError(error.message))
      return
    }

    await signOut()
    navigate(`${ROUTES.login}?reset=1`, { replace: true })
  }

  if (loading) {
    return (
      <AuthLayout eyebrow="Password" title="Set a new password">
        <AuthLoader className="min-h-[32vh] bg-transparent text-neutral-400" />
      </AuthLayout>
    )
  }

  if (!user) {
    return (
      <AuthLayout
        eyebrow="Link issue"
        title="This link has expired"
        subtitle="Request a new reset link to continue."
        footer={
          <p className="text-center text-sm text-neutral-500">
            <Link to={ROUTES.login} className="font-medium text-white underline-offset-4 hover:underline">
              Return to sign in
            </Link>
          </p>
        }
      >
        <AuthButton type="button" onClick={() => navigate(ROUTES.forgotPassword)}>
          Request a new link
        </AuthButton>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout eyebrow="Password" title="Set a new password">
      <form onSubmit={submit} className="space-y-5">
        {fieldError ? (
          <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{fieldError}</p>
        ) : null}
        <div>
          <label htmlFor="rp-password" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
            New password
          </label>
          <AuthInput id="rp-password" name="password" type="password" autoComplete="new-password" required />
          <p className="mt-2 text-xs text-neutral-500">{MIN_PASSWORD}+ characters, letters and numbers.</p>
        </div>
        <div>
          <label htmlFor="rp-confirm" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
            Confirm password
          </label>
          <AuthInput id="rp-confirm" name="confirm" type="password" autoComplete="new-password" required />
        </div>
        <AuthButton type="submit" disabled={busy || !isSupabaseConfigured}>
          {busy ? 'Saving…' : 'Save password'}
        </AuthButton>
      </form>
    </AuthLayout>
  )
}
