import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineHeart, HiOutlineShoppingBag, HiOutlineXMark } from 'react-icons/hi2'

import { ROUTES } from '../../constants'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { sizeLabelForKind } from '../../lib/productCategoryConfig'
import type { Product } from '../../types'
import { useCartStore } from '../../store/cartStore'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore, selectWishlistHas } from '../../store/wishlistStore'
import { formatPrice } from '../../utils/formatPrice'
import { cn } from '../../utils/cn'

import { Badge } from '../common/Badge'
import { Button } from '../common/Button'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

function descriptionSnippet(text: string, maxLength = 180) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  const trimmed = normalized.slice(0, maxLength)
  const lastSpace = trimmed.lastIndexOf(' ')
  return `${(lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed).trim()}…`
}

type QuickViewPanelProps = {
  product: Product
  titleId: string
  descriptionId: string
  panelRef: RefObject<HTMLDivElement | null>
  closeButtonRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}

function QuickViewPanel({
  product,
  titleId,
  descriptionId,
  panelRef,
  closeButtonRef,
  onClose,
}: QuickViewPanelProps) {
  const openCart = useUiStore((s) => s.openCart)
  const addLine = useCartStore((s) => s.addLine)
  const toggleWish = useWishlistStore((s) => s.toggle)
  const wishHas = useWishlistStore(selectWishlistHas(product.id))

  const sizes = product.sizes ?? []
  const colors = product.colors ?? []
  const tags = product.tags ?? []
  const images = product.images ?? []

  const [size, setSize] = useState(() => product.sizes?.[0] ?? '')
  const [color, setColor] = useState(() => product.colors?.[0]?.name ?? '')
  const [imageIndex, setImageIndex] = useState(0)

  const unit = product.salePrice ?? product.price
  const compare = product.salePrice ? product.price : null
  const mainImage = images[imageIndex] ?? images[0]
  const hasOptions = sizes.length > 0 || colors.length > 0
  const soldOut = product.stock === 0

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || focusable.length < 2) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    panel.addEventListener('keydown', onKeyDown)
    return () => panel.removeEventListener('keydown', onKeyDown)
  }, [closeButtonRef, panelRef, product.id])

  function addToCart() {
    addLine(product, size, color, 1)
    onClose()
    openCart()
  }

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex max-h-[min(92svh,920px)] w-full max-w-5xl flex-col overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-2xl sm:max-h-[min(88svh,860px)] sm:rounded-sm"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-4 sm:px-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-[var(--text-muted)]">Quick view</p>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded-full p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>

      <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] lg:border-b-0 lg:border-r">
          <div className="aspect-[3/4] overflow-hidden sm:aspect-[4/5] lg:aspect-auto lg:min-h-[28rem]">
            {mainImage ? (
              <img src={mainImage} alt={product.name} className="h-full w-full object-cover" loading="eager" />
            ) : (
              <div className="h-full w-full bg-[var(--surface-muted)]" />
            )}
          </div>
          {images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2 p-4 sm:grid-cols-5">
              {images.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  className={cn(
                    'aspect-square overflow-hidden border bg-[var(--surface-elevated)] transition',
                    index === imageIndex
                      ? 'border-[var(--text-primary)]'
                      : 'border-transparent opacity-70 hover:opacity-100',
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col px-4 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
          <h2 id={titleId} className="mt-4 font-serif text-3xl tracking-tight sm:text-4xl">
            {product.name}
          </h2>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            {product.category?.replace('-', ' ') ?? 'Collection'} · {product.gender ?? 'unisex'}
          </p>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-xl font-medium tabular-nums sm:text-2xl">{formatPrice(unit)}</span>
            {compare ? (
              <span className="text-sm tabular-nums text-[var(--text-muted)] line-through">{formatPrice(compare)}</span>
            ) : null}
          </div>
          <p id={descriptionId} className="mt-6 text-sm leading-relaxed text-[var(--text-secondary)]">
            {descriptionSnippet(product.description)}
          </p>

          <div className="mt-8 space-y-6">
            {colors.length ? (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-muted)]">Color</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {colors.map((entry) => (
                    <button
                      key={entry.name}
                      type="button"
                      onClick={() => setColor(entry.name)}
                      className={cn(
                        'flex items-center gap-2 border px-3 py-2 text-xs uppercase tracking-widest transition',
                        color === entry.name
                          ? 'border-[var(--text-primary)]'
                          : 'border-[var(--border-strong)] hover:border-[var(--text-primary)]',
                      )}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-[var(--border-subtle)]"
                        style={{ backgroundColor: entry.hex }}
                      />
                      {entry.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {sizes.length ? (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-muted)]">
                  {sizeLabelForKind(product.productKind)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sizes.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setSize(entry)}
                      className={cn(
                        'min-w-[48px] border px-3 py-2 text-xs tabular-nums transition',
                        size === entry
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--accent-contrast)]'
                          : 'border-[var(--border-strong)] hover:border-[var(--text-primary)]',
                      )}
                    >
                      {entry}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {!hasOptions ? (
              <p className="text-xs text-[var(--text-muted)]">This piece has no selectable options.</p>
            ) : null}
            <p className="text-xs text-[var(--text-muted)]">
              {soldOut ? 'Currently unavailable — join the waitlist' : `${product.stock} in stock`}
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row sm:flex-wrap">
            <Button
              className={cn('flex-1 sm:max-w-[240px]', soldOut && 'pointer-events-none opacity-40')}
              onClick={addToCart}
            >
              <HiOutlineShoppingBag className="h-4 w-4" />
              {soldOut ? 'Sold out' : 'Add to bag'}
            </Button>
            <Button variant="outline" className="flex-1 sm:max-w-[200px]" onClick={() => toggleWish(product.id)}>
              <HiOutlineHeart className={cn('h-4 w-4', wishHas && 'fill-current')} />
              {wishHas ? 'Saved' : 'Wishlist'}
            </Button>
            <Link
              to={ROUTES.product(product.slug)}
              onClick={onClose}
              className="inline-flex items-center justify-center px-2 py-3 text-[11px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)] underline-offset-4 transition hover:text-[var(--text-primary)] hover:underline"
            >
              View full details
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function ProductQuickViewModal() {
  const product = useUiStore((s) => s.quickViewProduct)
  const closeQuickView = useUiStore((s) => s.closeQuickView)

  const open = Boolean(product)
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeQuickView()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, closeQuickView])

  if (!product) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label="Close quick view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-neutral-950/55 backdrop-blur-[2px] dark:bg-black/70"
            onClick={closeQuickView}
          />
          <QuickViewPanel
            key={product.id}
            product={product}
            titleId={titleId}
            descriptionId={descriptionId}
            panelRef={panelRef}
            closeButtonRef={closeButtonRef}
            onClose={closeQuickView}
          />
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
