import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminLayout } from '../../components/admin/AdminLayout'
import { RequireAdmin } from '../../components/admin/RequireAdmin'
import { ROUTES } from '../../constants'

const AdminOverviewPage = lazy(() => import('./AdminOverviewPage'))
const AdminProductsPage = lazy(() => import('./AdminProductsPage'))
const AdminCategoriesPage = lazy(() => import('./AdminCategoriesPage'))
const AdminOrdersPage = lazy(() => import('./AdminOrdersPage'))
const AdminWaitlistPage = lazy(() => import('./AdminWaitlistPage'))
const AdminUsersPage = lazy(() => import('./AdminUsersPage'))
const AdminDiscountsPage = lazy(() => import('./AdminDiscountsPage'))
const AdminSettingsPage = lazy(() => import('./AdminSettingsPage'))
const AdminSecurityPage = lazy(() => import('./AdminSecurityPage'))

function DashboardFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-950 text-sm text-white/60">
      Loading dashboard…
    </div>
  )
}

export default function AdminProtectedEntry() {
  return (
    <RequireAdmin>
      <Suspense fallback={<DashboardFallback />}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="waitlist" element={<AdminWaitlistPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="discounts" element={<AdminDiscountsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="security" element={<AdminSecurityPage />} />
            <Route path="*" element={<Navigate to={ROUTES.admin} replace />} />
          </Route>
        </Routes>
      </Suspense>
    </RequireAdmin>
  )
}
