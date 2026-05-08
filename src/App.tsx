import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { MainLayout } from './layouts/MainLayout'
import { ROUTES } from './constants'

const HomePage = lazy(() => import('./pages/Home/HomePage'))
const ShopPage = lazy(() => import('./pages/Shop/ShopPage'))
const ProductPage = lazy(() => import('./pages/Product/ProductPage'))
const CartPage = lazy(() => import('./pages/Cart/CartPage'))
const CheckoutPage = lazy(() => import('./pages/Checkout/CheckoutPage'))
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'))
const AccountDashboardPage = lazy(() => import('./pages/Account/AccountDashboardPage'))

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-px w-32 animate-pulse bg-neutral-300" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.shop} element={<ShopPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path={ROUTES.cart} element={<CartPage />} />
            <Route path={ROUTES.checkout} element={<CheckoutPage />} />
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.register} element={<RegisterPage />} />
            <Route path={ROUTES.account} element={<AccountDashboardPage />} />
            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
