import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HiOutlineBars3,
  HiOutlineHeart,
  HiOutlineMagnifyingGlass,
  HiOutlineShoppingBag,
  HiOutlineUser,
} from 'react-icons/hi2'

import { BRAND, ROUTES } from '../../constants'
import { useCartStore } from '../../store/cartStore'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { cn } from '../../utils/cn'

import { Container } from './Container'

const links = [
  { to: ROUTES.shop, label: 'Shop' },
  { to: `${ROUTES.shop}?tag=new`, label: 'New' },
]

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  const [query, setQuery] = useState('')
  const count = useCartStore((s) => s.count())
  const wishCount = useWishlistStore((s) => s.ids.length)
  const openCart = useUiStore((s) => s.openCart)
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen)

  const isOverlay = isHome && !scrolled

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

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      navigate(ROUTES.shop)
      return
    }
    navigate(`${ROUTES.shop}?q=${encodeURIComponent(q)}`)
  }

  const fieldClass = cn(
    'flex min-w-0 flex-1 items-center gap-2 border-b pb-2',
    isOverlay ? 'border-white/40' : 'border-neutral-300',
  )

  const inputClass = cn(
    'min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400',
    isOverlay ? 'text-white placeholder:text-white/50' : 'text-neutral-900',
  )

  const iconClass = cn('h-4 w-4 shrink-0', isOverlay ? 'text-white/80' : 'text-neutral-500')

  return (
    <motion.header
      layout
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-500',
        isOverlay
          ? 'border-b border-white/15 bg-neutral-950/50 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md'
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
              <form
                onSubmit={onSearchSubmit}
                className={cn(fieldClass, 'hidden max-w-md flex-1 lg:flex')}
              >
                <HiOutlineMagnifyingGlass className={iconClass} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search collection"
                  className={inputClass}
                  aria-label="Search collection"
                />
              </form>

              <Link
                to={`${ROUTES.shop}?wishlist=1`}
                aria-label="Wishlist"
                className={cn(
                  'relative inline-flex shrink-0 p-2 transition hover:opacity-70',
                  isOverlay ? 'text-white' : 'text-neutral-900',
                )}
              >
                <HiOutlineHeart className="h-5 w-5" />
                {wishCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center border border-white bg-neutral-950 px-1 text-[9px] font-semibold text-white">
                    {wishCount}
                  </span>
                ) : null}
              </Link>
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
              <button
                type="button"
                aria-label="Open cart"
                onClick={openCart}
                className={cn(
                  'relative inline-flex shrink-0 p-2 transition hover:opacity-70',
                  isOverlay ? 'text-white' : 'text-neutral-900',
                )}
              >
                <HiOutlineShoppingBag className="h-5 w-5" />
                {count > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center border border-white bg-neutral-950 px-1 text-[9px] font-semibold text-white">
                    {count}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <form
            onSubmit={onSearchSubmit}
            className={cn(fieldClass, 'mt-2 pb-3 lg:hidden')}
          >
            <HiOutlineMagnifyingGlass className={iconClass} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search collection"
              className={inputClass}
              aria-label="Search collection"
            />
          </form>
        </div>
      </Container>
    </motion.header>
  )
}
