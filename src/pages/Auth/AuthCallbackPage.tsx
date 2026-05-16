import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { friendlyAuthError } from '../../lib/authErrors'
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
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    let cancelled = false

    async function finish() {
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) {
          setStatus('error')
          setMessage('Sign-in is not configured for this environment.')
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
        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (accessToken && refreshToken) {
          const { error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
        } else {
          const { data, error } = await client.auth.getSession()
          if (error) throw error
          if (!data.session) {
            throw new Error('This confirmation link is invalid or has expired.')
          }
        }

        const { data: sessionData, error: sessionError } = await client.auth.getSession()
        if (sessionError) throw sessionError

        if (!sessionData.session) {
          throw new Error('We could not establish a session from this link.')
        }

        window.history.replaceState({}, document.title, `${window.location.pathname}`)

        if (cancelled) return

        const isRecovery =
          flowType === 'recovery' ||
          flowType === 'password_recovery' ||
          hashParams.get('type') === 'recovery'

        if (isRecovery) {
          navigate(`${ROUTES.profile}?reset=1`, { replace: true })
          return
        }

        setStatus('success')
        setMessage('Your email has been confirmed. Taking you to your account…')

        const destination =
          flowType === 'signup' || flowType === 'email' || flowType === 'invite'
            ? ROUTES.account
            : next

        window.setTimeout(() => {
          if (!cancelled) navigate(destination, { replace: true })
        }, 900)
      } catch (err) {
        if (cancelled) return
        const raw = err instanceof Error ? err.message : 'Authentication failed.'
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
        eyebrow="Confirming"
        title="Verifying your link"
        subtitle="This only takes a moment. Please keep this tab open."
      >
        <AuthLoader className="min-h-[40vh] bg-transparent text-neutral-400" />
      </AuthLayout>
    )
  }

  if (status === 'success') {
    return (
      <AuthLayout
        eyebrow="Confirmed"
        title="You are signed in"
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
