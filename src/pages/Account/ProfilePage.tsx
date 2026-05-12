import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

import { ShippingAddressManager } from '../../components/account/ShippingAddressManager'
import { Container } from '../../components/layout/Container'
import { cn } from '../../utils/cn'

export default function ProfilePage() {
  const { user } = useAuth()
  const { appearanceMode, canPersistTheme, setAppearanceMode } = useTheme()

  return (
    <div className="pb-24">
      <ProfileHeader email={user?.email} />
      <Container className="py-12 md:py-16">
        <div className="max-w-3xl space-y-10">
          <section className="border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--text-muted)]">Account</p>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Signed in as <span className="font-medium text-[var(--text-primary)]">{user?.email}</span>
            </p>
          </section>

          {canPersistTheme ? (
            <section className="border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-8">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Appearance
              </p>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Choose a light or dark studio palette. Your preference is saved to your account.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {(['light', 'dark'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => void setAppearanceMode(mode)}
                    className={cn(
                      'border px-4 py-4 text-left transition',
                      appearanceMode === mode
                        ? 'border-[var(--text-primary)] bg-[var(--surface-muted)]'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
                    )}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[var(--text-primary)]">
                      {mode}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {mode === 'light' ? 'Gallery white with sharp contrast.' : 'Noir studio with soft highlights.'}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-8">
            <ShippingAddressManager />
          </section>
          <Link
            to={ROUTES.account}
            className="inline-block text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-primary)] underline-offset-4 hover:underline"
          >
            Back to studio dashboard
          </Link>
        </div>
      </Container>
    </div>
  )
}

function ProfileHeader({ email }: { email?: string | null }) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <Container className="py-14 md:py-16">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-[var(--text-muted)]">Profile</p>
        <h1 className="mt-3 font-serif text-4xl text-[var(--text-primary)] md:text-5xl">Account details</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--text-secondary)]">
          Manage saved shipping locations for faster checkout{email ? ` for ${email}` : ''}.
        </p>
      </Container>
    </div>
  )
}
