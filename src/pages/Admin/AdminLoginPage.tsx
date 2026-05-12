import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { isAdminUser, isEmailAllowedForAdmin } from '../../lib/adminAuth'

import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import { Container } from '../../components/layout/Container'

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
  const from = (location.state as { from?: string } | null)?.from ?? ROUTES.admin

  const [ready, setReady] = useState(false)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [busy, setBusy] = useState(false)
  const [lockMs, setLockMs] = useState(0)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setReady(true)
      return
    }

    const client = supabase

    client.auth.getSession().then(({ data }) => {
      const s = data.session ?? null
      setActiveSession(s)
      if (s && canAccessAdminSession(s)) {
        navigate(from, { replace: true })
        return
      }
      setReady(true)
    })

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
    setLockMs(getAdminLoginLockoutRemainingMs())
    return () => clearInterval(t)
  }, [])

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="min-h-svh bg-neutral-950 text-white">
        <Container className="py-16">
          <p className="text-sm text-white/60">Supabase is not configured.</p>
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
    if (getAdminLoginLockoutRemainingMs() > 0) {
      toast.error('Too many attempts. Try again later.')
      return
    }

    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')

    if (!isEmailAllowedForAdmin(email)) {
      recordAdminLoginFailure()
      setLockMs(getAdminLoginLockoutRemainingMs())
      toast.error('Sign-in failed.')
      return
    }

    setBusy(true)
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    setBusy(false)

    if (error || !data.session) {
      recordAdminLoginFailure()
      setLockMs(getAdminLoginLockoutRemainingMs())
      toast.error('Sign-in failed.')
      return
    }

    if (!isAdminUser(data.session.user)) {
      await sb.auth.signOut()
      recordAdminLoginFailure()
      setLockMs(getAdminLoginLockoutRemainingMs())
      toast.error('Sign-in failed.')
      return
    }

    clearAdminLoginFailures()
    toast.success('Signed in')
    navigate(from, { replace: true })
  }

  const locked = lockMs > 0
  const lockMinutes = Math.max(1, Math.ceil(lockMs / 60000))

  const blockingSession =
    activeSession && !canAccessAdminSession(activeSession) ? activeSession : null

  return (
    <div className="min-h-svh bg-neutral-950 text-white">
      <Container className="flex min-h-svh flex-col justify-center py-16 md:py-24">
        <div className="mx-auto w-full max-w-md">
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/40">Jeremy Atelier</p>
          <h1 className="mt-3 font-serif text-3xl text-white md:text-4xl">Admin sign-in</h1>
          <p className="mt-3 text-sm text-white/55">
            Authorized staff only. Access is enforced with Supabase Auth and row-level security on the database.
          </p>

          {blockingSession ? (
            <div className="mt-8 space-y-4 border border-white/20 bg-white/5 px-4 py-4 text-sm text-white/80">
              <p>
                You are signed in as <span className="font-medium text-white">{blockingSession.user.email}</span>, which
                cannot open the admin dashboard. Sign out first, then sign in with an admin account.
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
              Too many failed attempts. Wait about {lockMinutes} minute{lockMinutes === 1 ? '' : 's'} before trying again.
            </p>
          ) : null}

          <form onSubmit={submit} className="mt-10 space-y-5">
            <div>
              <FieldLabel id="admin-email">Email</FieldLabel>
              <Input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
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
                required
                disabled={locked || busy || !!blockingSession}
                className="border-white/20 bg-white/5 text-white placeholder:text-white/35 focus:border-white"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || locked || !!blockingSession}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-10 text-center text-xs text-white/45">
            <Link to={ROUTES.login} className="text-white/80 underline-offset-4 hover:underline">
              Customer sign-in
            </Link>
          </p>
        </div>
      </Container>
    </div>
  )
}
