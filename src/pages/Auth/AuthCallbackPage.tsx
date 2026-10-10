import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { afterAuthenticatedSession } from '../../lib/accountAccess'
import { AUTH_UNAVAILABLE_MESSAGE, friendlyAuthError } from '../../lib/authErrors'
import { sanitizeNextPath } from '../../lib/authRedirect'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

import { AuthButton } from '../../components/auth/AuthButton'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { AuthLoader } from '../../components/auth/AuthLoader'

type CallbackStatus = 'loading' | 'success' | 'error'

function parseHashParams(): URLSearchParams {
  const hash = window.location.hash.replace(/^#/, '')
  return hash ? new URLSearchParams(hash) : new URLSearchParams()
}

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<CallbackStatus>('loading')
  const [message, setMessage] = useState('')
  const [successTitle, setSuccessTitle] = useState('Welcome back')
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    let cancelled = false

    async function finish() {
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) {
          setStatus('error')
          setMessage(AUTH_UNAVAILABLE_MESSAGE)
        }
        return
      }

      const client = supabase
      const next = sanitizeNextPath(searchParams.get('next'))
      const flowType = searchParams.get('type') ?? searchParams.get('flow') ?? ''
      const oauthError = searchParams.get('error')
      const oauthDescription = searchParams.get('error_description')

      if (oauthError) {
        if (!cancelled) {
          setStatus('error')
          setMessage(friendlyAuthError(oauthDescription ?? oauthError))
        }
        return
      }

      const code = searchParams.get('code')
      const hashParams = parseHashParams()
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      try {
        if (accessToken && refreshToken) {
          const { error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
        }

        // The client is configured with `detectSessionInUrl: true`, so it already exchanges
        // a `?code=` param for a session the first time any auth call resolves internally
        // (including this `getSession()` call) — calling `exchangeCodeForSession(code)`
        // ourselves here would reuse an already-consumed code and throw "PKCE code verifier
        // not found in storage" every time, since the one-time verifier is already gone.
        const { data: sessionData, error: sessionError } = await client.auth.getSession()
        if (sessionError) throw sessionError

        if (!sessionData.session) {
          throw new Error(
            code
              ? 'This confirmation link is invalid or has expired.'
              : 'This sign-in link did not work. Please try again.',
          )
        }

        window.history.replaceState({}, document.title, `${window.location.pathname}`)

        if (cancelled) return

        const blocked = await afterAuthenticatedSession(sessionData.session.user.id)
        if (blocked) throw blocked

        const isRecovery =
          flowType === 'recovery' ||
          flowType === 'password_recovery' ||
          hashParams.get('type') === 'recovery'

        if (isRecovery) {
          navigate(ROUTES.resetPassword, { replace: true })
          return
        }

        const isEmailFlow = flowType === 'signup' || flowType === 'email' || flowType === 'invite'

        setStatus('success')
        setSuccessTitle(isEmailFlow ? 'Email confirmed' : 'Welcome back')
        setMessage(
          isEmailFlow
            ? 'Your email is confirmed. Opening your account…'
            : 'Welcome back. Opening your account…',
        )

        const destination = isEmailFlow ? ROUTES.account : next

        window.setTimeout(() => {
          if (!cancelled) navigate(destination, { replace: true })
        }, 900)
      } catch (err) {
        if (cancelled) return
        const raw = err instanceof Error ? err.message : 'We could not finish signing you in. Please try again.'
        setStatus('error')
        setMessage(friendlyAuthError(raw))
      }
    }

    void finish()
    return () => {
      cancelled = true
    }
  }, [navigate, searchParams])

  if (status === 'loading') {
    return (
      <AuthLayout
        eyebrow="Signing in"
        title="One moment"
        subtitle="We're confirming your access. Please keep this tab open."
      >
        <AuthLoader className="min-h-[40vh] bg-transparent text-neutral-400" />
      </AuthLayout>
    )
  }

  if (status === 'success') {
    return (
      <AuthLayout
        eyebrow="Welcome"
        title={successTitle}
        subtitle={message}
      >
        <AuthLoader className="min-h-[32vh] bg-transparent text-neutral-400" />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="Link issue"
      title="We could not finish signing you in"
      subtitle={message}
      footer={
        <p className="text-center text-sm text-neutral-500">
          <Link to={ROUTES.login} className="font-medium text-white underline-offset-4 hover:underline">
            Return to sign in
          </Link>
          {' · '}
          <Link to={ROUTES.register} className="text-neutral-300 underline-offset-4 hover:underline">
            Create account
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <p className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{message}</p>
        <AuthButton type="button" onClick={() => navigate(ROUTES.login, { replace: true })}>
          Go to sign in
        </AuthButton>
      </div>
    </AuthLayout>
  )
}
