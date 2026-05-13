import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { listCustomerOrders } from '../../services/orderService'

import { ShippingAddressManager } from '../../components/account/ShippingAddressManager'
import { AccountSidebar } from '../../components/account/dashboard/AccountSidebar'
import { DashboardHeader } from '../../components/account/dashboard/DashboardHeader'
import { DashboardSkeleton } from '../../components/account/dashboard/DashboardSkeleton'
import { LogoutModal } from '../../components/account/dashboard/LogoutModal'
import { Container } from '../../components/layout/Container'
import { cn } from '../../utils/cn'

type ProfileTab = 'account' | 'appearance' | 'addresses'

function displayName(fullName: unknown, email: string | undefined): string {
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim()
  if (email) return email.split('@')[0] ?? 'Member'
  return 'Member'
}

function formatMemberSince(createdAt: string | undefined): string {
  if (!createdAt) return '—'
  return new Date(createdAt).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { appearanceMode, canPersistTheme, setAppearanceMode } = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<ProfileTab>('account')
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  const ordersQuery = useQuery({
    queryKey: ['customer', 'orders', user?.id],
    queryFn: listCustomerOrders,
    enabled: Boolean(user?.id),
  })

  const userName = useMemo(
    () => displayName(user?.user_metadata?.full_name, user?.email),
    [user?.email, user?.user_metadata?.full_name],
  )
  const memberSince = formatMemberSince(user?.created_at)
  const orders = ordersQuery.data ?? []

  useEffect(() => {
    if (activeTab === 'appearance' && !canPersistTheme) {
      setActiveTab('account')
    }
  }, [activeTab, canPersistTheme])

  async function confirmLogout() {
    setLogoutBusy(true)
    try {
      await signOut()
      queryClient.clear()
      toast.success('Signed out successfully.')
      navigate(ROUTES.home, { replace: true })
    } catch {
      toast.error('Unable to sign out right now.')
    } finally {
      setLogoutBusy(false)
      setLogoutOpen(false)
    }
  }

  if (!user) {
    return <DashboardSkeleton />
  }

  if (ordersQuery.isLoading || ordersQuery.isFetching) {
    return <DashboardSkeleton />
  }

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'account', label: 'Account' },
    ...(canPersistTheme ? [{ id: 'appearance' as const, label: 'Appearance' }] : []),
    { id: 'addresses', label: 'Addresses' },
  ]

  return (
    <div className="pb-24">
      <DashboardHeader userName={userName} memberSince={memberSince} totalOrders={orders.length} />

      <Container className="py-12 md:py-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <AccountSidebar onLogout={() => setLogoutOpen(true)} />

          <motion.main
            className="min-w-0 flex-1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="border-b border-[var(--border-subtle)] pb-8">
              <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-[var(--text-muted)]">Profile</p>
              <h1 className="mt-2 font-serif text-3xl text-[var(--text-primary)] md:text-4xl">Account details</h1>
              <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
                Switch tabs to update your account, appearance, and shipping addresses — no page reload.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Profile sections"
              className="mt-8 flex flex-wrap gap-2 border-b border-[var(--border-subtle)]"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`profile-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`profile-panel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    '-mb-px border-b-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors',
                    activeTab === tab.id
                      ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-8">
              <AnimatePresence mode="wait">
                {activeTab === 'account' ? (
                  <motion.section
                    key="account"
                    role="tabpanel"
                    id="profile-panel-account"
                    aria-labelledby="profile-tab-account"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-8"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      Account
                    </p>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      Signed in as{' '}
                      <span className="font-medium text-[var(--text-primary)]">{user.email}</span>
                    </p>
                  </motion.section>
                ) : null}

                {activeTab === 'appearance' && canPersistTheme ? (
                  <motion.section
                    key="appearance"
                    role="tabpanel"
                    id="profile-panel-appearance"
                    aria-labelledby="profile-tab-appearance"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-8"
                  >
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
                            {mode === 'light'
                              ? 'Gallery white with sharp contrast.'
                              : 'Noir studio with soft highlights.'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </motion.section>
                ) : null}

                {activeTab === 'addresses' ? (
                  <motion.section
                    key="addresses"
                    role="tabpanel"
                    id="profile-panel-addresses"
                    aria-labelledby="profile-tab-addresses"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-8"
                  >
                    <ShippingAddressManager />
                  </motion.section>
                ) : null}
              </AnimatePresence>
            </div>

          </motion.main>
        </div>
      </Container>

      <LogoutModal
        open={logoutOpen}
        busy={logoutBusy}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => void confirmLogout()}
      />
    </div>
  )
}
