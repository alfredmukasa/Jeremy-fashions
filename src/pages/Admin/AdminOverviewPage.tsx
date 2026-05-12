import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { AdminStatCard } from '../../components/admin/AdminStatCard'
import { ROUTES } from '../../constants'
import { adminGetDashboardStats, adminListOrders, adminListProducts } from '../../services/adminService'

export default function AdminOverviewPage() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: adminGetDashboardStats,
  })

  const recentOrdersQuery = useQuery({
    queryKey: ['admin', 'orders', 'recent'],
    queryFn: adminListOrders,
  })

  const topProductsQuery = useQuery({
    queryKey: ['admin', 'products', 'top'],
    queryFn: adminListProducts,
  })

  const stats = statsQuery.data
  const recentOrders = (recentOrdersQuery.data ?? []).slice(0, 5)
  const topProducts = (topProductsQuery.data ?? [])
    .filter((p) => p.featured)
    .slice(0, 5)

  return (
    <div className="space-y-10">
      <AdminPageHeader
        eyebrow="Dashboard"
        title="Overview"
        description="Live metrics from Supabase for products, waitlist, customers, and orders."
        actions={
          <Link
            to={ROUTES.shop}
            className="inline-flex items-center justify-center rounded-none border border-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 transition-all hover:bg-neutral-950 hover:text-white"
          >
            View storefront
          </Link>
        }
      />

      {statsQuery.isLoading ? (
        <p className="text-sm text-neutral-600">Loading metrics…</p>
      ) : statsQuery.isError ? (
        <p className="text-sm text-red-600">Could not load dashboard metrics.</p>
      ) : stats ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard label="Products" value={stats.productCount} />
          <AdminStatCard label="Waitlist" value={stats.waitlistCount} hint={`${stats.pendingWaitlist} pending`} />
          <AdminStatCard label="Customers" value={stats.userCount} />
          <AdminStatCard
            label="Revenue"
            value={`$${stats.revenueTotal.toFixed(2)}`}
            hint={`${stats.pendingOrders} open orders`}
          />
          <AdminStatCard
            label="Low stock"
            value={stats.lowStockCount}
            hint="Active SKUs at 5 units or less"
            tone={stats.lowStockCount > 0 ? 'alert' : 'default'}
          />
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-6 py-4">
            <h2 className="font-serif text-xl text-neutral-950">Recent orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-neutral-100">
                    <td className="px-4 py-3 text-neutral-600">
                      {new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">{order.email}</td>
                    <td className="px-4 py-3 capitalize text-neutral-600">{order.status}</td>
                    <td className="px-4 py-3">${Number(order.total_amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!recentOrders.length ? (
              <p className="p-8 text-sm text-neutral-600">No orders yet. Fulfillment data will appear here.</p>
            ) : null}
          </div>
        </section>

        <section className="border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-6 py-4">
            <h2 className="font-serif text-xl text-neutral-950">Featured products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => (
                  <tr key={product.id} className="border-t border-neutral-100">
                    <td className="px-4 py-3 font-medium text-neutral-900">{product.title}</td>
                    <td className="px-4 py-3 text-neutral-600">{product.category}</td>
                    <td className="px-4 py-3">{product.stock_quantity ?? 0}</td>
                    <td className="px-4 py-3">${Number(product.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!topProducts.length ? (
              <p className="p-8 text-sm text-neutral-600">Mark products as featured to highlight them here.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
