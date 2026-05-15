import { Suspense, lazy, type ElementType, type ReactElement } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { MainLayout } from './layouts/MainLayout'
import { ROUTES } from './constants'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { WaitlistModeProvider } from './context/WaitlistModeContext'
import { WaitlistPublicGate } from './components/waitlist/WaitlistPublicGate'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { isAdminPortalMounted } from './lib/adminPortal'
import { queryClient } from './lib/queryClient'

const HomePage = lazy(() => import('./pages/Home/HomePage'))
const ShopPage = lazy(() => import('./pages/Shop/ShopPage'))
const ProductPage = lazy(() => import('./pages/Product/ProductPage'))
const CartPage = lazy(() => import('./pages/Cart/CartPage'))
const CheckoutPage = lazy(() => import('./pages/Checkout/CheckoutPage'))
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'))
const AccountDashboardPage = lazy(() => import('./pages/Account/AccountDashboardPage'))
const OrdersPage = lazy(() => import('./pages/Account/OrdersPage'))
const ProfilePage = lazy(() => import('./pages/Account/ProfilePage'))
const SavedListPage = lazy(() => import('./pages/Account/SavedListPage'))
const WaitlistPage = lazy(() => import('./pages/Waitlist/WaitlistPage'))

const adminLazy = isAdminPortalMounted()
  ? {
      Login: lazy(() => import('./pages/Admin/AdminLoginPage')),
      Shell: lazy(() => import('./pages/Admin/AdminProtectedEntry')),
    }
  : null

function PageFallback() {
  return (
    <div className="min-h-[70vh] px-4 py-12 sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <div className="h-3 w-40 skeleton-shimmer" />
        <div className="mt-10 grid gap-8 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="aspect-[3/4] skeleton-shimmer" />
              <div className="h-3 w-3/4 skeleton-shimmer" />
              <div className="h-3 w-1/3 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function page(Component: ElementType): ReactElement {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WaitlistModeProvider>
          <AuthProvider>
          <ThemeProvider>
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#0a0a0a',
                color: '#fafafa',
                borderRadius: 0,
                fontSize: 13,
                letterSpacing: '0.02em',
              },
              success: {
                iconTheme: { primary: '#34d399', secondary: '#0a0a0a' },
              },
              error: {
                iconTheme: { primary: '#f87171', secondary: '#0a0a0a' },
              },
            }}
          />
          <Routes>
            {adminLazy ? (
              <>
                <Route path={ROUTES.adminLogin} element={page(adminLazy.Login)} />
                <Route path={`${ROUTES.admin}/*`} element={page(adminLazy.Shell)} />
              </>
            ) : null}
            <Route
              path={ROUTES.login}
              element={
                <WaitlistPublicGate>
                  {page(LoginPage)}
                </WaitlistPublicGate>
              }
            />
            <Route
              path={ROUTES.register}
              element={
                <WaitlistPublicGate>
                  {page(RegisterPage)}
                </WaitlistPublicGate>
              }
            />
            <Route
              path={ROUTES.forgotPassword}
              element={
                <WaitlistPublicGate>
                  {page(ForgotPasswordPage)}
                </WaitlistPublicGate>
              }
            />
            <Route element={<MainLayout />}>
              <Route path={ROUTES.home} element={page(HomePage)} />
              <Route path={ROUTES.shop} element={page(ShopPage)} />
              <Route path="/product/:slug" element={page(ProductPage)} />
              <Route path={ROUTES.cart} element={page(CartPage)} />
              <Route element={<ProtectedRoute />}>
                <Route path={ROUTES.account} element={page(AccountDashboardPage)} />
                <Route path={ROUTES.checkout} element={page(CheckoutPage)} />
                <Route path={ROUTES.orders} element={page(OrdersPage)} />
                <Route path={ROUTES.profile} element={page(ProfilePage)} />
                <Route path={ROUTES.saved} element={page(SavedListPage)} />
              </Route>
              <Route path={ROUTES.waitlist} element={page(WaitlistPage)} />
              <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
            </Route>
          </Routes>
          </ThemeProvider>
          </AuthProvider>
          </WaitlistModeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
