import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HiOutlineBars3, HiOutlineHeart, HiOutlineShoppingBag, HiOutlineUser } from 'react-icons/hi2'

import { BRAND, ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { useWaitlistMode } from '../../context/WaitlistModeContext'
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
]

const SCROLL_THRESHOLD = 24
const SCROLL_DELTA = 10

export function Navbar() {
  const { user } = useAuth()
  const { appearanceMode } = useTheme()
  const { waitlistMode } = useWaitlistMode()
  const location = useLocation()
  const isHome = location.pathname === ROUTES.home && !waitlistMode
  const wishlistHref = user ? ROUTES.saved : `${ROUTES.shop}?wishlist=1`
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const cartCount = useCartStore(selectCartItemCount)
  const wishCount = useWishlistStore(selectWishlistCount)
  const openCart = useUiStore((s) => s.openCart)
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen)

  const isWaitlistLanding = waitlistMode && location.pathname === ROUTES.waitlist
  const isOverlay = (isHome && !scrolled) || isWaitlistLanding
  const isDark = appearanceMode === 'dark'

  useEffect(() => {
    lastScrollY.current = window.scrollY

    const onScroll = () => {
      const current = window.scrollY
      const delta = current - lastScrollY.current

      if (isHome || isWaitlistLanding) {
        setScrolled(current > SCROLL_THRESHOLD)
      }

      if (current < 72) {
        setHidden(false)
      } else if (delta > SCROLL_DELTA) {
        setHidden(true)
      } else if (delta < -SCROLL_DELTA) {
        setHidden(false)
      }

      lastScrollY.current = current
    }

    const id = requestAnimationFrame(() => onScroll())
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('scroll', onScroll)
    }
  }, [isHome, isWaitlistLanding, location.pathname])

  useEffect(() => {
    queueMicrotask(() => {
      setHidden(false)
      setScrolled(false)
      lastScrollY.current = 0
    })
  }, [location.pathname])

  return (
    <motion.header
      layout
      className={cn(
        'fixed inset-x-0 z-40 will-change-transform',
        'top-[var(--announcement-height)]',
        hidden ? 'nav-hide' : 'nav-show',
        isOverlay
          ? 'border-b border-white/10 bg-neutral-950/40 text-white shadow-[0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl'
          : isDark
            ? 'border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)] text-[var(--text-primary)] backdrop-blur-xl'
            : 'border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)] text-[var(--text-primary)] backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.04)]',
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
                  'inline-flex shrink-0 p-2 transition-opacity duration-300 hover:opacity-70 md:hidden',
                  isOverlay ? 'text-white' : 'text-[var(--text-primary)]',
                )}
              >
                <HiOutlineBars3 className="h-6 w-6" />
              </button>
              <Link
                to={waitlistMode ? ROUTES.waitlist : ROUTES.home}
                className={cn(
                  'truncate font-serif text-lg tracking-[0.1em] sm:text-xl md:text-2xl',
                  isOverlay ? 'text-white' : 'text-[var(--text-primary)]',
                )}
              >
                {BRAND}
              </Link>
            </div>

            <nav className="hidden items-center gap-8 md:flex lg:gap-12">
              {!waitlistMode
                ? links.map((l) => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      className={({ isActive }) =>
                        cn(
                          'text-[11px] font-medium uppercase tracking-[0.26em] transition-opacity duration-300 hover:opacity-60',
                          isOverlay ? 'text-white' : 'text-[var(--text-secondary)]',
                          isActive && !isOverlay && 'text-[var(--text-primary)]',
                        )
                      }
                    >
                      {l.label}
                    </NavLink>
                  ))
                : (
                    <span className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/55">
                      Private access
                    </span>
                  )}
            </nav>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2 md:max-w-none md:flex-[1.2] md:gap-3">
              {!waitlistMode ? (
                <ProductSearchField
                  key={location.pathname === ROUTES.shop ? location.search : 'global'}
                  overlay={isOverlay}
                  className="hidden max-w-md lg:flex"
                />
              ) : null}

              {!waitlistMode ? (
                <Link
                  to={wishlistHref}
                  aria-label={wishCount > 0 ? `Wishlist, ${wishCount} saved` : 'Wishlist'}
                  className={cn(
                    'relative inline-flex shrink-0 p-2 transition-opacity duration-300 hover:opacity-70',
                    isOverlay ? 'text-white' : 'text-[var(--text-primary)]',
                  )}
                >
                  <HiOutlineHeart className="h-5 w-5" />
                  {wishCount > 0 ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[9px] font-semibold',
                        isOverlay
                          ? 'border border-white/30 bg-neutral-950 text-white'
                          : 'border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)]',
                      )}
                    >
                      {wishCount}
                    </span>
                  ) : null}
                </Link>
              ) : null}
              <ThemeToggle overlay={isOverlay} />
              {!waitlistMode && user ? (
                <Link
                  to={ROUTES.account}
                  aria-label="Account"
                  className={cn(
                    'hidden shrink-0 p-2 transition-opacity duration-300 hover:opacity-70 sm:inline-flex',
                    isOverlay ? 'text-white' : 'text-[var(--text-primary)]',
                  )}
                >
                  <HiOutlineUser className="h-5 w-5" />
                </Link>
              ) : null}
              {!waitlistMode && !user ? (
                <Link
                  to={ROUTES.login}
                  className={cn(
                    'inline-flex shrink-0 items-center border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] transition-all duration-300 hover:opacity-80 sm:px-4 sm:py-2 sm:text-[11px]',
                    isOverlay
                      ? 'border-white/35 text-white hover:bg-white/10'
                      : 'border-[var(--border-strong)] text-[var(--text-primary)] hover:border-[var(--text-primary)]',
                  )}
                >
                  Sign In
                </Link>
              ) : null}
              {!waitlistMode ? (
                <button
                  type="button"
                  aria-label={cartCount > 0 ? `Open cart, ${cartCount} items` : 'Open cart'}
                  onClick={openCart}
                  className={cn(
                    'relative inline-flex shrink-0 p-2 transition-opacity duration-300 hover:opacity-70',
                    isOverlay ? 'text-white' : 'text-[var(--text-primary)]',
                  )}
                >
                  <HiOutlineShoppingBag className="h-5 w-5" />
                  {cartCount > 0 ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[9px] font-semibold',
                        isOverlay
                          ? 'border border-white/30 bg-neutral-950 text-white'
                          : 'border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)]',
                      )}
                    >
                      {cartCount}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
          </div>

          {!waitlistMode ? (
            <ProductSearchField
              key={location.pathname === ROUTES.shop ? location.search : 'global-mobile'}
              overlay={isOverlay}
              className="mt-2 pb-3 lg:hidden"
            />
          ) : null}
        </div>
      </Container>
    </motion.header>
  )
}
