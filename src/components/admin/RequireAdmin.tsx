import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Link, Navigate, useLocation } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { isAdminUser } from '../../lib/adminAuth'

import { Button } from '../common/Button'
import { Container } from '../layout/Container'

import { AdminSessionContext } from './AdminSessionContext'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setReady(true)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="min-h-svh pb-24">
        <Container className="py-16">
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Admin</p>
          <h1 className="mt-3 font-serif text-3xl text-neutral-950">Jeremy admin</h1>
          <p className="mt-4 text-sm text-neutral-600">
            Configure <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to use this dashboard.
          </p>
        </Container>
      </div>
    )
  }

  const sb = supabase

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-950 text-sm text-white/60">
        Verifying session…
      </div>
    )
  }

  if (!session) {
    return <Navigate to={ROUTES.adminLogin} replace state={{ from: location.pathname }} />
  }

  if (!isAdminUser(session.user)) {
    return (
      <div className="min-h-svh pb-24">
        <Container className="py-16 md:py-20">
          <h1 className="font-serif text-3xl text-neutral-950">Access denied</h1>
          <p className="mt-3 max-w-lg text-sm text-neutral-600">
            Signed in as <span className="font-medium">{session.user.email}</span>, but this account is not authorized for
            admin tools. App Metadata must include{' '}
            <span className="font-mono text-xs text-neutral-800">role: &quot;admin&quot;</span>, then sign out and sign
            in again.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void sb.auth.signOut()}>
              Sign out
            </Button>
            <Link
              to={ROUTES.adminLogin}
              className="inline-flex items-center justify-center rounded-none border border-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 transition-all hover:bg-neutral-950 hover:text-white"
            >
              Admin sign-in
            </Link>
          </div>
        </Container>
      </div>
    )
  }

  return <AdminSessionContext.Provider value={session}>{children}</AdminSessionContext.Provider>
}
