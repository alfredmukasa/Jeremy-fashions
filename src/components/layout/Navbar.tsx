import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
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
import { Container } from './Container'

const links = [
  { to: ROUTES.home, label: 'Home' },
  { to: ROUTES.shop, label: 'Shop' },
  { to: `${ROUTES.shop}?tag=new`, label: 'New' },
]

const SCROLL_THRESHOLD = 24
const SCROLL_DELTA = 10

function NavIconButton({
  children,
  className,
  ...props
}: ComponentProps<'button'> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex shrink-0 p-2 transition-opacity duration-300 hover:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function NavIconLink({
  children,
  className,
  ...props
}: ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    <Link
      className={cn(
        'relative inline-flex shrink-0 p-2 transition-opacity duration-300 hover:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  )
}

export function Navbar() {
  const { user } = useAuth()
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

  const homeHeroOverlay = isHome && isOverlay
  const iconTone = homeHeroOverlay ? 'text-white' : isOverlay ? 'text-white' : 'text-neutral-900'
  const badgeClass = homeHeroOverlay
    ? 'border border-white/30 bg-neutral-950 text-white'
    : isOverlay
      ? 'border border-white/30 bg-neutral-950 text-white'
      : 'border border-neutral-200 bg-white text-neutral-900'

  const glassOverlay = cn(
    'border-b text-white',
    'supports-[backdrop-filter]:backdrop-blur-md supports-[backdrop-filter]:backdrop-saturate-150',
  )
  const glassScrolled = cn(
    'border-b border-neutral-200 bg-white text-neutral-900',
    'supports-[backdrop-filter]:border-white/20 supports-[backdrop-filter]:bg-white/85',
    'supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150',
  )

  return (
    <motion.header
      className={cn(
        'fixed inset-x-0 z-40 will-change-transform',
        'top-[var(--announcement-height)]',
        hidden ? 'nav-hide' : 'nav-show',
        homeHeroOverlay
          ? cn(
              glassOverlay,
              'border-white/10 bg-neutral-950/40',
              'supports-[backdrop-filter]:border-white/10 supports-[backdrop-filter]:bg-black/20',
            )
          : isOverlay
            ? cn(
                glassOverlay,
                'border-white/15 bg-neutral-950/45',
                'supports-[backdrop-filter]:border-white/15 supports-[backdrop-filter]:bg-black/25',
              )
            : glassScrolled,
      )}
    >
      <Container>
        <div className="flex min-h-[48px] items-center gap-3 md:min-h-[56px] md:gap-4">
          <div className="flex shrink-0 items-center gap-3 overflow-hidden md:gap-4">
            <Link
              to={waitlistMode ? ROUTES.waitlist : ROUTES.home}
              className={cn(
                'shrink-0 font-serif text-[13px] uppercase tracking-[0.22em] transition-opacity duration-300 hover:opacity-70 sm:text-sm',
                homeHeroOverlay || (isOverlay && !isHome)
                  ? 'text-white'
                  : !isOverlay
                    ? 'text-neutral-900'
                    : 'text-white',
              )}
              aria-label={BRAND}
            >
              {BRAND}
            </Link>
            {!waitlistMode ? (
              <span
                className={cn(
                  'hidden rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] sm:inline',
                  homeHeroOverlay || (isOverlay && !isHome)
                    ? 'border-white/25 text-white/70'
                    : !isOverlay
                      ? 'border-neutral-300 text-neutral-600'
                      : 'border-white/25 text-white/70',
                )}
                aria-hidden="true"
              >
                CAD
              </span>
            ) : null}
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-8 md:flex lg:gap-10">
            {!waitlistMode
              ? links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === ROUTES.home}
                    className={({ isActive }) =>
                      cn(
                        'text-[11px] font-medium uppercase tracking-[0.2em] transition-opacity duration-300 hover:opacity-50',
                        homeHeroOverlay || (isOverlay && !isHome) ? 'text-white' : !isOverlay ? 'text-neutral-900' : 'text-white',
                        isActive && 'opacity-100',
                        !isActive && 'opacity-70',
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                ))
              : (
                  <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
                    Private access
                  </span>
                )}
          </nav>

          <div className="ml-auto flex items-center gap-0 md:gap-0.5">
            {!waitlistMode ? (
              <div className="relative">
                <ProductSearchField
                  key={location.pathname === ROUTES.shop ? location.search : 'global'}
                  variant="icon"
                  overlay={homeHeroOverlay || (isWaitlistLanding && isOverlay)}
                />
              </div>
            ) : null}

            {!waitlistMode ? (
              <NavIconLink
                to={wishlistHref}
                aria-label={wishCount > 0 ? `Wishlist, ${wishCount} saved` : 'Wishlist'}
                className={cn('hidden md:inline-flex', iconTone)}
              >
                <HiOutlineHeart className="h-5 w-5" />
                {wishCount > 0 ? (
                  <span aria-hidden="true" className={cn('absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[9px] font-semibold', badgeClass)}>
                    {wishCount}
                  </span>
                ) : null}
              </NavIconLink>
            ) : null}

            <ThemeToggle overlay={homeHeroOverlay || (isWaitlistLanding && isOverlay)} className="hidden md:inline-flex" />

            {!waitlistMode && user ? (
              <NavIconLink to={ROUTES.account} aria-label="Account" className={cn('hidden md:inline-flex', iconTone)}>
                <HiOutlineUser className="h-5 w-5" />
              </NavIconLink>
            ) : null}

            {!waitlistMode && !user ? (
              <Link
                to={ROUTES.login}
                className={cn(
                  'hidden px-2 py-2 text-[10px] font-medium uppercase tracking-[0.2em] transition-opacity hover:opacity-50 md:inline-flex',
                  iconTone,
                )}
              >
                Sign In
              </Link>
            ) : null}

            {!waitlistMode ? (
              <NavIconButton
                aria-label={cartCount > 0 ? `Open cart, ${cartCount} items` : 'Open cart'}
                onClick={openCart}
                className={iconTone}
              >
                <HiOutlineShoppingBag className="h-5 w-5" />
                {cartCount > 0 ? (
                  <span aria-hidden="true" className={cn('absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[9px] font-semibold', badgeClass)}>
                    {cartCount}
                  </span>
                ) : null}
              </NavIconButton>
            ) : null}

            <NavIconButton
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className={cn('md:hidden', iconTone)}
            >
              <HiOutlineBars3 className="h-6 w-6" />
            </NavIconButton>
          </div>
        </div>
      </Container>
    </motion.header>
  )
}
