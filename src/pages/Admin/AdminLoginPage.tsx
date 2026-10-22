import { useEffect, useRef, useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { isAdminUser, isEmailAllowedForAdmin } from '../../lib/adminAuth'
import { getAuthCallbackUrl } from '../../lib/authRedirect'
import {
  ADMIN_LOGIN_MAX_FAILURES,
  ADMIN_PASSWORD_MAX_LENGTH,
  adminReturnPath,
} from '../../lib/adminLoginPolicy'
import { friendlyAuthError } from '../../lib/authErrors'

import { BrandLogo } from '../../components/common/BrandLogo'
import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import { Container } from '../../components/layout/Container'
import { Seo } from '../../components/seo/Seo'

import {
  clearAdminLoginFailures,
  getAdminLoginLockoutRemainingMs,
  recordAdminLoginFailure,
} from './adminLoginLockout'

function canAccessAdminSession(s: Session): boolean {
  return isAdminUser(s.user) && isEmailAllowedForAdmin(s.user.email)
}

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = adminReturnPath(
    (location.state as { from?: string } | null)?.from,
    ROUTES.admin,
  )

  const [ready, setReady] = useState(!isSupabaseConfigured || !supabase)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [busy, setBusy] = useState(false)
  const [lockMs, setLockMs] = useState(() => getAdminLoginLockoutRemainingMs())
  const pending = useRef(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    const client = supabase

    client.auth
      .getSession()
      .then(({ data }) => {
        const s = data.session ?? null
        setActiveSession(s)
        if (s && canAccessAdminSession(s)) {
          navigate(from, { replace: true })
          return
        }
        setReady(true)
      })
      .catch(() => setReady(true))

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      setActiveSession(next)
      if (next && canAccessAdminSession(next)) {
        navigate(from, { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [from, navigate])

  useEffect(() => {
    const t = setInterval(() => {
      setLockMs(getAdminLoginLockoutRemainingMs())
    }, 500)
    return () => clearInterval(t)
  }, [])

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="min-h-svh bg-neutral-950 text-white">
        <Container className="py-16">
          <p className="text-sm text-white/60">
            Staff sign-in is temporarily unavailable. Please try again shortly.
          </p>
        </Container>
      </div>
    )
  }

  const sb = supabase

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-950 text-sm text-white/60">
        Loading…
      </div>
    )
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending.current) return
    if (getAdminLoginLockoutRemainingMs() > 0) {
      toast.error('Too many attempts. Try again later.')
      return
    }

    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    if (!password || password.length > ADMIN_PASSWORD_MAX_LENGTH) {
      toast.error(
        `Enter a password of up to ${ADMIN_PASSWORD_MAX_LENGTH} characters.`,
      )
      return
    }

    if (!isEmailAllowedForAdmin(email)) {
      recordAdminLoginFailure()
      setLockMs(getAdminLoginLockoutRemainingMs())
      toast.error('Sign-in failed.')
      return
    }

    pending.current = true
    setBusy(true)
    try {
      const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
        /\/$/,
        '',
      )
      const response = await fetch(`${base}/admin/auth/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 401 || response.status === 429) {
          recordAdminLoginFailure(Number(result.retryAfterSeconds) || 0)
          setLockMs(getAdminLoginLockoutRemainingMs())
        }
        toast.error(
          response.status === 429
            ? 'Too many password attempts. Please wait before trying again.'
            : response.status === 503
              ? 'Staff sign-in is temporarily unavailable. Please try again shortly.'
              : 'Sign-in failed. Check your details and try again.',
        )
        return
      }
      const { data, error } = await sb.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      })
      if (error || !data.session || !canAccessAdminSession(data.session)) {
        await sb.auth.signOut({ scope: 'local' })
        toast.error('Sign-in failed. Please try again.')
        return
      }
      clearAdminLoginFailures()
      toast.success('Signed in')
      navigate(from, { replace: true })
    } catch {
      toast.error(
        'We could not reach staff sign-in. Check your connection and try again.',
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function signInWithGoogle() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    try {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthCallbackUrl({ next: from, type: 'admin' }),
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw error
    } catch (error) {
      pending.current = false
      setBusy(false)
      toast.error(
        friendlyAuthError(
          error instanceof Error
            ? error.message
            : 'Google sign-in is unavailable. Please try again.',
        ),
      )
    }
  }

  const locked = lockMs > 0
  const lockMinutes = Math.max(1, Math.ceil(lockMs / 60000))

  const blockingSession =
    activeSession && !canAccessAdminSession(activeSession)
      ? activeSession
      : null

  return (
    <div className="min-h-svh bg-neutral-950 text-white">
      <Seo title="Staff sign-in" path={ROUTES.adminLogin} noindex />
      <Container className="flex min-h-svh flex-col justify-center py-16 md:py-24">
        <div className="mx-auto w-full max-w-md">
          <BrandLogo variant="light" size="md" className="mb-6" />
          <h1 className="font-serif text-3xl text-white md:text-4xl">
            Admin sign-in
          </h1>
          <p className="mt-3 text-sm text-white/55">Authorized staff only.</p>

          {blockingSession ? (
            <div className="mt-8 space-y-4 border border-white/20 bg-white/5 px-4 py-4 text-sm text-white/80">
              <p>
                You are signed in as{' '}
                <span className="font-medium text-white">
                  {blockingSession.user.email}
                </span>
                , which cannot open the admin dashboard. Sign out first, then
                sign in with an admin account.
              </p>
              <Button
                type="button"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10"
                onClick={() => void sb.auth.signOut()}
              >
                Sign out
              </Button>
            </div>
          ) : null}

          {locked ? (
            <p className="mt-8 border border-white/20 bg-white/5 px-4 py-3 text-sm text-amber-200/90">
              Too many password attempts. Wait about {lockMinutes} minute
              {lockMinutes === 1 ? '' : 's'} before trying again. Authorized
              staff can still use Google sign-in.
            </p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            disabled={busy || !!blockingSession}
            onClick={() => void signInWithGoogle()}
            className="mt-8 flex w-full items-center justify-center gap-3 border-white/30 text-white hover:bg-white/10"
          >
            <FcGoogle className="h-5 w-5" aria-hidden />
            Continue with Google
          </Button>
          <p className="mt-3 text-center text-xs text-white/55">
            Use the Google account already authorized for admin access.
          </p>
          <div
            className="my-6 flex items-center gap-3 text-xs text-white/40"
            aria-hidden="true"
          >
            <span className="h-px flex-1 bg-white/15" />
            or use your password
            <span className="h-px flex-1 bg-white/15" />
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <FieldLabel id="admin-email">Email</FieldLabel>
              <Input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
                disabled={locked || busy || !!blockingSession}
                className="border-white/20 bg-white/5 text-white placeholder:text-white/35 focus:border-white"
              />
            </div>
            <div>
              <FieldLabel id="admin-password">Password</FieldLabel>
              <Input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                maxLength={ADMIN_PASSWORD_MAX_LENGTH}
                aria-describedby="admin-password-limits"
                required
                disabled={locked || busy || !!blockingSession}
                className="border-white/20 bg-white/5 text-white placeholder:text-white/35 focus:border-white"
              />
              <p
                id="admin-password-limits"
                className="mt-2 text-xs leading-relaxed text-white/50"
              >
                Up to {ADMIN_PASSWORD_MAX_LENGTH} characters.{' '}
                {ADMIN_LOGIN_MAX_FAILURES} failed attempts trigger a 15-minute
                password cooldown.
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={busy || locked || !!blockingSession}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-10 text-center text-xs text-white/45">
            <Link
              to={ROUTES.login}
              className="text-white/80 underline-offset-4 hover:underline"
            >
              Customer sign-in
            </Link>
          </p>
        </div>
      </Container>
    </div>
  )
}
