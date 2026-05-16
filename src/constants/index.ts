import { getAdminBasePath } from '../lib/adminPortal'

export const BRAND = 'JEREMY ATELIER'

const adminBase = getAdminBasePath()

export const ROUTES = {
  home: '/',
  shop: '/shop',
  product: (slug: string) => `/product/${slug}`,
  cart: '/cart',
  checkout: '/checkout',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  authCallback: '/auth/callback',
  account: '/account',
  profile: '/profile',
  orders: '/orders',
  /** Saved pieces (auth); guests use shop wishlist filter locally */
  saved: '/saved',
  waitlist: '/waitlist',
  /** Staff area — default /jeremy-admin; also reachable via /admin (redirect) */
  admin: adminBase,
  adminLogin: `${adminBase}/login`,
  adminProducts: `${adminBase}/products`,
  adminCategories: `${adminBase}/categories`,
  adminOrders: `${adminBase}/orders`,
  adminWaitlist: `${adminBase}/waitlist`,
  adminUsers: `${adminBase}/users`,
  adminDiscounts: `${adminBase}/discounts`,
  adminSettings: `${adminBase}/settings`,
  adminSecurity: `${adminBase}/security`,
} as const

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
] as const

export type SortValue = (typeof SORT_OPTIONS)[number]['value']
