import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HiOutlineBars3,
  HiOutlineHeart,
  HiOutlineShoppingBag,
  HiOutlineUser,
} from 'react-icons/hi2'

import { BRAND, ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { useCartStore, selectCartItemCount } from '../../store/cartStore'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore, selectWishlistCount } from '../../store/wishlistStore'
import { cn } from '../../utils/cn'

import { ThemeToggle } from '../common/ThemeToggle'
import { ProductSearchField } from '../search/ProductSearchField'
import { useTheme } from '../../context/ThemeContext'

import { Container } from './Container'

const links = [
  { to: ROUTES.shop, label: 'Shop' },
  { to: `${ROUTES.shop}?tag=new`, label: 'New' },
  { to: ROUTES.waitlist, label: 'Waitlist' },
]

export function Navbar() {
  const { user } = useAuth()
  const { appearanceMode } = useTheme()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const wishlistHref = user ? ROUTES.saved : `${ROUTES.shop}?wishlist=1`
  const [scrolled, setScrolled] = useState(false)
  const cartCount = useCartStore(selectCartItemCount)
  const wishCount = useWishlistStore(selectWishlistCount)
  const openCart = useUiStore((s) => s.openCart)
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen)

  const isOverlay = isHome && !scrolled
  const isDark = appearanceMode === 'dark'

  useEffect(() => {
    if (!isHome) return
    const onScroll = () => setScrolled(window.scrollY > 24)
    const id = requestAnimationFrame(() => onScroll())
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('scroll', onScroll)
    }
  }, [isHome, location.pathname])

  return (
    <motion.header
      layout
      className={cn(
        'fixed inset-x-0 z-40 transition-colors duration-500',
        'top-[var(--announcement-height)]',
        isOverlay
          ? 'border-b border-white/15 bg-neutral-950/50 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md'
          : isDark
            ? 'border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)] text-[var(--text-primary)] backdrop-blur-md'
            : 'border-b border-neutral-200/80 bg-white/90 text-neutral-900 backdrop-blur-md',
      )}
    >
      <Container>
        <div className="flex flex-col">
          <div className="flex min-h-[56px] items-center justify-between gap-2 sm:min-h-16 md:min-h-[72px] md:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
                className={cn(
                  'inline-flex shrink-0 p-2 transition md:hidden',
                  isOverlay ? 'text-white' : 'text-neutral-900',
                )}
              >
                <HiOutlineBars3 className="h-6 w-6" />
              </button>
              <Link
                to={ROUTES.home}
                className={cn(
                  'truncate font-serif text-lg tracking-[0.08em] sm:text-xl md:text-2xl',
                  isOverlay ? 'text-white' : 'text-neutral-950',
                )}
              >
                {BRAND}
              </Link>
            </div>

            <nav className="hidden items-center gap-8 md:flex lg:gap-10">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      'text-[11px] font-medium uppercase tracking-[0.28em] transition hover:opacity-70',
                      isOverlay ? 'text-white' : 'text-neutral-800',
                      isActive && !isOverlay && 'text-neutral-950',
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2 md:max-w-none md:flex-[1.2] md:gap-3">
              <ProductSearchField
                key={location.pathname === ROUTES.shop ? location.search : 'global'}
                overlay={isOverlay}
                className="hidden max-w-md lg:flex"
              />

              <Link
                to={wishlistHref}
                aria-label={wishCount > 0 ? `Wishlist, ${wishCount} saved` : 'Wishlist'}
                className={cn(
                  'relative inline-flex shrink-0 p-2 transition hover:opacity-70',
                  isOverlay ? 'text-white' : 'text-neutral-900',
                )}
              >
                <HiOutlineHeart className="h-5 w-5" />
                {wishCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center border border-white bg-neutral-950 px-1 text-[9px] font-semibold text-white"
                  >
                    {wishCount}
                  </span>
                ) : null}
              </Link>
              <ThemeToggle overlay={isOverlay} />
              {user ? (
                <Link
                  to={ROUTES.account}
                  aria-label="Account"
                  className={cn(
                    'hidden shrink-0 p-2 transition hover:opacity-70 sm:inline-flex',
                    isOverlay ? 'text-white' : 'text-neutral-900',
                  )}
                >
                  <HiOutlineUser className="h-5 w-5" />
                </Link>
              ) : (
                <Link
                  to={ROUTES.login}
                  className={cn(
                    'inline-flex shrink-0 items-center border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] transition hover:opacity-80 sm:px-4 sm:py-2 sm:text-[11px]',
                    isOverlay
                      ? 'border-white/40 text-white hover:bg-white/10'
                      : 'border-neutral-300 text-neutral-900 hover:border-neutral-950',
                  )}
                >
                  Sign In
                </Link>
              )}
              <button
                type="button"
                aria-label={cartCount > 0 ? `Open cart, ${cartCount} items` : 'Open cart'}
                onClick={openCart}
                className={cn(
                  'relative inline-flex shrink-0 p-2 transition hover:opacity-70',
                  isOverlay ? 'text-white' : 'text-neutral-900',
                )}
              >
                <HiOutlineShoppingBag className="h-5 w-5" />
                {cartCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center border border-white bg-neutral-950 px-1 text-[9px] font-semibold text-white"
                  >
                    {cartCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <ProductSearchField
            key={location.pathname === ROUTES.shop ? location.search : 'global-mobile'}
            overlay={isOverlay}
            className="mt-2 pb-3 lg:hidden"
          />
        </div>
      </Container>
    </motion.header>
  )
}
