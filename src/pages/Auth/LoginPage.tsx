import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'

import { AuthButton } from '../../components/auth/AuthButton'
import { AuthInput } from '../../components/auth/AuthInput'
import { AuthLayout } from '../../components/auth/AuthLayout'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, signIn } = useAuth()
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from
  const redirectTo =
    from && from !== ROUTES.login && from !== ROUTES.register ? from : ROUTES.account

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured.')
      return
    }
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Signed in')
    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthLayout
      eyebrow="Sign in"
      title="Welcome back"
      subtitle={
        isSupabaseConfigured
          ? 'Use your studio credentials. Sessions stay signed in across refreshes on this device.'
          : 'Configure Supabase environment variables to enable live sign-in.'
      }
      footer={
        <p className="text-center text-sm text-neutral-500">
          New here?{' '}
          <Link to={ROUTES.register} className="font-medium text-white underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      {loading ? (
        <p className="text-sm text-neutral-500">Checking session…</p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              Email
            </label>
            <AuthInput
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@domain.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              Password
            </label>
            <AuthInput
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" name="remember" className="h-4 w-4 rounded-none border-white/30 bg-white/5" />
              Remember this device
            </label>
            <Link to={ROUTES.forgotPassword} className="text-neutral-300 underline-offset-4 hover:underline">
              Forgot password
            </Link>
          </div>
          <AuthButton type="submit" disabled={busy || !isSupabaseConfigured}>
            {busy ? 'Signing in…' : 'Sign in'}
          </AuthButton>
        </form>
      )}
    </AuthLayout>
  )
}
