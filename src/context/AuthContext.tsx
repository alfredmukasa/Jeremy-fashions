import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { ROUTES } from '../constants'
import { getAuthCallbackUrl } from '../lib/authRedirect'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type SignInResult = { error: Error | null }
type SignUpResult = { error: Error | null; session: Session | null }

export type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<SignInResult>
  signUp: (args: { email: string; password: string; fullName: string }) => Promise<SignUpResult>
  signOut: () => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<SignInResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const path = window.location.pathname
    if (path === ROUTES.authCallback) return

    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash.replace(/^#/, '')
    const hashParams = hash ? new URLSearchParams(hash) : null
    const hasCode = params.has('code')
    const hasImplicit = hashParams?.has('access_token') ?? false
    const hasAuthError = params.has('error') && params.has('error_description')

    if (hasCode || hasImplicit || hasAuthError) {
      const target = new URL(getAuthCallbackUrl())
      params.forEach((value, key) => target.searchParams.set(key, value))
      if (hash) target.hash = hash
      window.location.replace(target.toString())
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null)
      setLoading(false)
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session ?? null)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    if (!supabase) {
      return { error: new Error('Supabase is not configured.') }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const signUp = useCallback(
    async (args: { email: string; password: string; fullName: string }): Promise<SignUpResult> => {
      if (!supabase) {
        return { error: new Error('Supabase is not configured.'), session: null }
      }
      const { data, error } = await supabase.auth.signUp({
        email: args.email,
        password: args.password,
        options: {
          data: { full_name: args.fullName },
          emailRedirectTo: getAuthCallbackUrl({ type: 'signup' }),
        },
      })
      return {
        error: error ? new Error(error.message) : null,
        session: data.session ?? null,
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const resetPasswordForEmail = useCallback(async (email: string): Promise<SignInResult> => {
    if (!supabase) {
      return { error: new Error('Supabase is not configured.') }
    }
    const redirectTo = getAuthCallbackUrl({ type: 'recovery', next: '/login?reset=1' })
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      resetPasswordForEmail,
    }),
    [session, loading, signIn, signUp, signOut, resetPasswordForEmail],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
