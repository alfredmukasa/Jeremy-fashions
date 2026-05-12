import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  HiOutlineHeart,
  HiOutlineMapPin,
  HiOutlineShoppingBag,
  HiOutlineSparkles,
} from 'react-icons/hi2'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { listCustomerOrdersDetailed } from '../../services/orderService'
import { listShippingAddresses } from '../../services/shippingAddressService'
import { useWishlistStore } from '../../store/wishlistStore'

import { AccountSidebar } from '../../components/account/dashboard/AccountSidebar'
import { DashboardHeader } from '../../components/account/dashboard/DashboardHeader'
import { DashboardSkeleton } from '../../components/account/dashboard/DashboardSkeleton'
import { EmptyState } from '../../components/account/dashboard/EmptyState'
import { LogoutModal } from '../../components/account/dashboard/LogoutModal'
import { OrderCard } from '../../components/account/dashboard/OrderCard'
import { OrderHistoryTable } from '../../components/account/dashboard/OrderHistoryTable'
import { UserProfileCard } from '../../components/account/dashboard/UserProfileCard'
import { Container } from '../../components/layout/Container'
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

export default function AccountDashboardPage() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const savedCount = useWishlistStore((state) => state.ids.length)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

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
  const recentOrders = orders.slice(0, 3)
  const addressCount = addressesQuery.data?.length ?? 0

  useEffect(() => {
    if (!location.hash) return
    const target = document.querySelector(location.hash)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, ordersQuery.isSuccess])

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

  if (
    ordersQuery.isLoading ||
    ordersQuery.isFetching ||
    addressesQuery.isLoading ||
    addressesQuery.isFetching
  ) {
    return <DashboardSkeleton />
  }

  return (
    <div className="pb-24">
      <DashboardHeader userName={userName} memberSince={memberSince} totalOrders={orders.length} />

      <Container className="py-12 md:py-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <AccountSidebar onLogout={() => setLogoutOpen(true)} />

          <motion.main
            className="min-w-0 flex-1 space-y-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <UserProfileCard
              userName={userName}
              email={user.email ?? ''}
              memberSince={memberSince}
              totalOrders={orders.length}
              savedCount={savedCount}
              addressCount={addressCount}
            />

            <section id="recent-orders" aria-labelledby="recent-orders-heading" className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Recent orders</p>
                  <h2 id="recent-orders-heading" className="mt-2 font-serif text-2xl text-neutral-950 md:text-3xl">
                    Latest from your wardrobe
                  </h2>
                </div>
                <Link
                  to={ROUTES.orders}
                  className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-600 underline-offset-4 transition-colors hover:text-neutral-950 hover:underline"
                >
                  View all orders
                </Link>
              </div>

              {ordersQuery.isError ? (
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

            <OrderHistoryTable orders={orders} />

            <section aria-labelledby="account-shortcuts-heading" className="space-y-6">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Shortcuts</p>
              <h2 id="account-shortcuts-heading" className="font-serif text-2xl text-neutral-950 md:text-3xl">
                Keep your account organized
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <ShortcutCard
                  to={ROUTES.profile}
                  title="Saved addresses"
                  description={
                    addressCount
                      ? `${addressCount} shipping location${addressCount === 1 ? '' : 's'} ready for checkout.`
                      : 'Add a delivery address for faster checkout.'
                  }
                  icon={<HiOutlineMapPin className="h-5 w-5" aria-hidden />}
                />
                <ShortcutCard
                  to={ROUTES.saved}
                  title="Wishlist"
                  description={
                    savedCount
                      ? `${savedCount} saved piece${savedCount === 1 ? '' : 's'} waiting in your list.`
                      : 'Save pieces you love while you browse the collection.'
                  }
                  icon={<HiOutlineHeart className="h-5 w-5" aria-hidden />}
                />
                <ShortcutCard
                  to={ROUTES.profile}
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
              <Button className="mt-6" variant="outline" onClick={() => setLogoutOpen(true)}>
                Sign out
              </Button>
            </section>
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

function ShortcutCard({
  to,
  title,
  description,
  icon,
}: {
  to: string
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <Link
      to={to}
      className="group rounded-sm border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors group-hover:bg-neutral-950 group-hover:text-white">
        {icon}
      </div>
      <h3 className="mt-5 font-serif text-xl text-neutral-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{description}</p>
    </Link>
  )
}
