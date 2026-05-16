import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { friendlyAuthError } from '../../lib/authErrors'
import { isSupabaseConfigured } from '../../lib/supabase'

import { AuthButton } from '../../components/auth/AuthButton'
import { AuthInput } from '../../components/auth/AuthInput'
import { AuthLayout } from '../../components/auth/AuthLayout'

const MIN_PASSWORD = 8

function validatePassword(pw: string): string | null {
  if (pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Include at least one letter and one number.'
  return null
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { user, loading, signUp } = useAuth()
  const [busy, setBusy] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  if (!loading && user) {
    return <Navigate to={ROUTES.account} replace />
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldError(null)
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured.')
      return
    }
    const fd = new FormData(e.currentTarget)
    const first = String(fd.get('first') ?? '').trim()
    const last = String(fd.get('last') ?? '').trim()
    const email = String(fd.get('email') ?? '').trim()
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

    const fullName = [first, last].filter(Boolean).join(' ')
    setBusy(true)
    const { error, session } = await signUp({ email, password, fullName: fullName || email })
    setBusy(false)
    if (error) {
      toast.error(friendlyAuthError(error.message))
      return
    }
    if (session) {
      toast.success('Account created — you are signed in.')
      navigate(ROUTES.account, { replace: true })
    } else {
      toast.success('Check your email to confirm your account, then sign in.')
      navigate(ROUTES.login, { replace: true })
    }
  }

  return (
    <AuthLayout
      eyebrow="Register"
      title="Join the studio list"
      subtitle={
        isSupabaseConfigured
          ? 'Create a Supabase Auth account and a public profile row for your membership.'
          : 'Configure Supabase to enable registration.'
      }
      footer={
        <p className="text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link to={ROUTES.login} className="font-medium text-white underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {fieldError ? (
          <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{fieldError}</p>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-first" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              First name
            </label>
            <AuthInput id="reg-first" name="first" autoComplete="given-name" required />
          </div>
          <div>
            <label htmlFor="reg-last" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              Last name
            </label>
            <AuthInput id="reg-last" name="last" autoComplete="family-name" required />
          </div>
        </div>
        <div>
          <label htmlFor="reg-email" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
            Email
          </label>
          <AuthInput id="reg-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label htmlFor="reg-password" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
            Password
          </label>
          <AuthInput id="reg-password" name="password" type="password" autoComplete="new-password" required />
          <p className="mt-2 text-xs text-neutral-500">{MIN_PASSWORD}+ characters, letters and numbers.</p>
        </div>
        <div>
          <label htmlFor="reg-confirm" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
            Confirm password
          </label>
          <AuthInput id="reg-confirm" name="confirm" type="password" autoComplete="new-password" required />
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-xs text-neutral-400">
          <input type="checkbox" required className="mt-1 h-4 w-4 rounded-none border-white/30 bg-white/5" />I agree to
          the terms and privacy policy.
        </label>
        <AuthButton type="submit" disabled={busy || !isSupabaseConfigured}>
          {busy ? 'Creating…' : 'Create account'}
        </AuthButton>
      </form>
    </AuthLayout>
  )
}
