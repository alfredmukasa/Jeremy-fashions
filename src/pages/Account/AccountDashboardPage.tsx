import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  HiOutlineHeart,
  HiOutlineMapPin,
  HiOutlineShoppingBag,
  HiOutlineSparkles,
} from 'react-icons/hi2'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useProducts } from '../../hooks/useCatalog'
import { listCustomerOrdersDetailed, type CustomerOrderDetail } from '../../services/orderService'
import { listShippingAddresses } from '../../services/shippingAddressService'
import { useWishlistStore } from '../../store/wishlistStore'
import { cn } from '../../utils/cn'

import { AccountSidebar } from '../../components/account/dashboard/AccountSidebar'
import { ACCOUNT_SECTION_IDS, type AccountSection } from '../../components/account/dashboard/accountSections'
import { DashboardHeader } from '../../components/account/dashboard/DashboardHeader'
import { DashboardSkeleton } from '../../components/account/dashboard/DashboardSkeleton'
import { EmptyState } from '../../components/account/dashboard/EmptyState'
import { LogoutModal } from '../../components/account/dashboard/LogoutModal'
import { OrderCard } from '../../components/account/dashboard/OrderCard'
import { OrderHistoryTable } from '../../components/account/dashboard/OrderHistoryTable'
import { UserProfileCard } from '../../components/account/dashboard/UserProfileCard'
import { ShippingAddressManager } from '../../components/account/ShippingAddressManager'
import { Container } from '../../components/layout/Container'
import { ProductGrid } from '../../components/product/ProductGrid'
import { Button } from '../../components/common/Button'

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

function sectionFromHash(hash: string): AccountSection {
  const id = hash.replace(/^#/, '')
  return (ACCOUNT_SECTION_IDS as string[]).includes(id) ? (id as AccountSection) : 'dashboard'
}

export default function AccountDashboardPage() {
  const { user, signOut, resetPasswordForEmail } = useAuth()
  const { appearanceMode, canPersistTheme, setAppearanceMode } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const savedCount = useWishlistStore((state) => state.ids.length)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  const activeSection = useMemo(() => sectionFromHash(location.hash), [location.hash])

  const ordersQuery = useQuery({
    queryKey: ['customer', 'orders', 'detailed', user?.id],
    queryFn: listCustomerOrdersDetailed,
    enabled: Boolean(user?.id),
  })

  const addressesQuery = useQuery({
    queryKey: ['customer', 'shipping-addresses', user?.id],
    queryFn: listShippingAddresses,
    enabled: Boolean(user?.id),
  })

  const userName = useMemo(
    () => displayName(user?.user_metadata?.full_name, user?.email),
    [user?.email, user?.user_metadata?.full_name],
  )
  const memberSince = formatMemberSince(user?.created_at)
  const orders = ordersQuery.data ?? []
  const addressCount = addressesQuery.data?.length ?? 0

  function selectSection(section: AccountSection) {
    navigate(section === 'dashboard' ? ROUTES.account : `${ROUTES.account}#${section}`, { replace: true })
  }

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

  return (
    <div className="pb-24">
      <DashboardHeader userName={userName} memberSince={memberSince} />

      <Container className="py-12 md:py-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <AccountSidebar activeSection={activeSection} onSelect={selectSection} onLogout={() => setLogoutOpen(true)} />

          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.main
                key={activeSection}
                className="space-y-10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeSection === 'dashboard' ? (
                  <DashboardPanel
                    userName={userName}
                    email={user.email ?? ''}
                    memberSince={memberSince}
                    savedCount={savedCount}
                    addressCount={addressCount}
                    orders={orders}
                    ordersLoading={ordersQuery.isLoading}
                    ordersError={ordersQuery.isError}
                    onSelectSection={selectSection}
                    onLogout={() => setLogoutOpen(true)}
                  />
                ) : null}

                {activeSection === 'orders' ? (
                  <OrdersPanel orders={orders} isLoading={ordersQuery.isLoading} isError={ordersQuery.isError} />
                ) : null}

                {activeSection === 'addresses' ? <AddressesPanel /> : null}

                {activeSection === 'wishlist' ? <WishlistPanel /> : null}

                {activeSection === 'settings' ? (
                  <SettingsPanel
                    email={user.email ?? ''}
                    appearanceMode={appearanceMode}
                    canPersistTheme={canPersistTheme}
                    setAppearanceMode={setAppearanceMode}
                  />
                ) : null}

                {activeSection === 'security' ? (
                  <SecurityPanel email={user.email ?? ''} resetPasswordForEmail={resetPasswordForEmail} />
                ) : null}
              </motion.main>
            </AnimatePresence>
          </div>
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

function DashboardPanel({
  userName,
  email,
  memberSince,
  savedCount,
  addressCount,
  orders,
  ordersLoading,
  ordersError,
  onSelectSection,
  onLogout,
}: {
  userName: string
  email: string
  memberSince: string
  savedCount: number
  addressCount: number
  orders: CustomerOrderDetail[]
  ordersLoading: boolean
  ordersError: boolean
  onSelectSection: (section: AccountSection) => void
  onLogout: () => void
}) {
  const recentOrders = orders.slice(0, 3)

  return (
    <div className="space-y-10">
      <UserProfileCard
        userName={userName}
        email={email}
        memberSince={memberSince}
        totalOrders={orders.length}
        savedCount={savedCount}
        addressCount={addressCount}
      />

      <section aria-labelledby="recent-orders-heading" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Recent orders</p>
            <h2 id="recent-orders-heading" className="mt-2 font-serif text-2xl text-neutral-950 md:text-3xl">
              Latest from your wardrobe
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onSelectSection('orders')}
            className="text-left text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-600 underline-offset-4 transition-colors hover:text-neutral-950 hover:underline"
          >
            View all orders
          </button>
        </div>

        {ordersLoading ? (
          <p className="text-sm text-neutral-600">Loading recent orders…</p>
        ) : ordersError ? (
          <div className="rounded-sm border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            Unable to load your orders right now.
          </div>
        ) : recentOrders.length ? (
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No orders yet"
            description="Start shopping to see your orders here."
            actionLabel="Explore the collection"
            icon={<HiOutlineShoppingBag className="h-5 w-5" aria-hidden />}
          />
        )}
      </section>

      <section aria-labelledby="account-shortcuts-heading" className="space-y-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Shortcuts</p>
        <h2 id="account-shortcuts-heading" className="font-serif text-2xl text-neutral-950 md:text-3xl">
          Keep your account organized
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ShortcutCard
            onClick={() => onSelectSection('addresses')}
            title="Saved addresses"
            description={
              addressCount
                ? `${addressCount} shipping location${addressCount === 1 ? '' : 's'} ready for checkout.`
                : 'Add a delivery address for faster checkout.'
            }
            icon={<HiOutlineMapPin className="h-5 w-5" aria-hidden />}
          />
          <ShortcutCard
            onClick={() => onSelectSection('wishlist')}
            title="Wishlist"
            description={
              savedCount
                ? `${savedCount} saved piece${savedCount === 1 ? '' : 's'} waiting in your list.`
                : 'Save pieces you love while you browse the collection.'
            }
            icon={<HiOutlineHeart className="h-5 w-5" aria-hidden />}
          />
          <ShortcutCard
            onClick={() => onSelectSection('settings')}
            title="Account settings"
            description="Update your profile details and default shipping preferences."
            icon={<HiOutlineSparkles className="h-5 w-5" aria-hidden />}
          />
        </div>
      </section>

      <section
        aria-labelledby="account-logout-heading"
        className="rounded-sm border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Session</p>
        <h2 id="account-logout-heading" className="mt-2 font-serif text-2xl text-neutral-950">
          Sign out securely
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
          End your session on this device. You can sign back in any time with your Jeremy Fashion account.
        </p>
        <Button className="mt-6" variant="outline" onClick={onLogout}>
          Sign out
        </Button>
      </section>
    </div>
  )
}

function OrdersPanel({
  orders,
  isLoading,
  isError,
}: {
  orders: CustomerOrderDetail[]
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading) {
    return <p className="text-sm text-neutral-600">Loading your orders…</p>
  }

  if (isError) {
    return (
      <div className="rounded-sm border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Unable to load your orders right now.
      </div>
    )
  }

  return <OrderHistoryTable orders={orders} />
}

function AddressesPanel() {
  return (
    <section aria-labelledby="account-addresses-heading" className="space-y-6">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Addresses</p>
        <h2 id="account-addresses-heading" className="mt-2 font-serif text-2xl text-neutral-950 md:text-3xl">
          Saved addresses
        </h2>
      </div>
      <ShippingAddressManager />
    </section>
  )
}

function WishlistPanel() {
  const ids = useWishlistStore((state) => state.ids)
  const { data: products, loading, error } = useProducts()
  const saved = (products ?? []).filter((product) => ids.includes(product.id))

  return (
    <section aria-labelledby="account-wishlist-heading" className="space-y-6">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Wishlist</p>
        <h2 id="account-wishlist-heading" className="mt-2 font-serif text-2xl text-neutral-950 md:text-3xl">
          Saved pieces
        </h2>
      </div>
      {loading && !products ? (
        <p className="text-sm text-neutral-600">Loading collection…</p>
      ) : error ? (
        <p className="text-sm text-neutral-600">Could not load products.</p>
      ) : saved.length ? (
        <ProductGrid products={saved} className="mt-4" />
      ) : (
        <EmptyState
          title="Nothing saved yet"
          description="Save pieces you love while you browse the collection."
          actionLabel="Explore the collection"
          icon={<HiOutlineHeart className="h-5 w-5" aria-hidden />}
        />
      )}
    </section>
  )
}

function SettingsPanel({
  email,
  appearanceMode,
  canPersistTheme,
  setAppearanceMode,
}: {
  email: string
  appearanceMode: 'light' | 'dark'
  canPersistTheme: boolean
  setAppearanceMode: (mode: 'light' | 'dark') => Promise<void>
}) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--text-muted)]">Settings</p>
        <h2 className="mt-2 font-serif text-2xl text-[var(--text-primary)] md:text-3xl">Account settings</h2>
      </div>

      <section
        aria-labelledby="account-details-heading"
        className="border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-8"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--text-muted)]">Account</p>
        <h3 id="account-details-heading" className="sr-only">
          Account details
        </h3>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Signed in as <span className="font-medium text-[var(--text-primary)]">{email}</span>
        </p>
      </section>

      {canPersistTheme ? (
        <section
          aria-labelledby="account-appearance-heading"
          className="border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-8"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--text-muted)]">Appearance</p>
          <h3 id="account-appearance-heading" className="sr-only">
            Appearance
          </h3>
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
        </section>
      ) : null}
    </div>
  )
}

function SecurityPanel({
  email,
  resetPasswordForEmail,
}: {
  email: string
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>
}) {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendReset() {
    if (!email) return
    setBusy(true)
    const { error } = await resetPasswordForEmail(email)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
    toast.success('Password reset email sent.')
  }

  return (
    <section
      aria-labelledby="account-security-heading"
      className="rounded-sm border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Security</p>
      <h2 id="account-security-heading" className="mt-2 font-serif text-2xl text-neutral-950">
        Password
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
        We&apos;ll email a secure link to <span className="font-medium text-neutral-900">{email}</span> so you can
        choose a new password. The link expires in 1 hour.
      </p>
      <Button className="mt-6" variant="outline" disabled={busy || sent} onClick={() => void sendReset()}>
        {busy ? 'Sending…' : sent ? 'Email sent' : 'Send password reset email'}
      </Button>
    </section>
  )
}

function ShortcutCard({
  onClick,
  title,
  description,
  icon,
}: {
  onClick: () => void
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-sm border border-neutral-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors group-hover:bg-neutral-950 group-hover:text-white">
        {icon}
      </div>
      <h3 className="mt-5 font-serif text-xl text-neutral-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{description}</p>
    </button>
  )
}
