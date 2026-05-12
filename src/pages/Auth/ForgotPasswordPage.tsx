import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'

import { AuthButton } from '../../components/auth/AuthButton'
import { AuthInput } from '../../components/auth/AuthInput'
import { AuthLayout } from '../../components/auth/AuthLayout'

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth()
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured.')
      return
    }
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    setBusy(true)
    const { error } = await resetPasswordForEmail(email)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
    toast.success('If an account exists, a reset link is on the way.')
  }

  return (
    <AuthLayout
      eyebrow="Password"
      title="Reset access"
      subtitle="We will email you a secure link to choose a new password. The link expires quickly — use it from the same device when possible."
      footer={
        <p className="text-center text-xs text-neutral-500">
          <Link to={ROUTES.login} className="text-neutral-300 underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <p className="text-sm text-neutral-400">Check your inbox and spam folder for the reset message.</p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="fp-email" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              Email
            </label>
            <AuthInput id="fp-email" name="email" type="email" autoComplete="email" required placeholder="you@domain.com" />
          </div>
          <AuthButton type="submit" disabled={busy || !isSupabaseConfigured}>
            {busy ? 'Sending…' : 'Send reset link'}
          </AuthButton>
        </form>
      )}
    </AuthLayout>
  )
}
