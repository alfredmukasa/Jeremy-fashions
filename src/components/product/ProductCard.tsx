import type { MouseEvent } from 'react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { HiOutlineHeart, HiOutlineShoppingBag } from 'react-icons/hi2'

import type { Product } from '../../types'
import { useCartStore } from '../../store/cartStore'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore, selectWishlistHas } from '../../store/wishlistStore'
import { formatPrice } from '../../utils/formatPrice'
import { cn } from '../../utils/cn'

import { Badge } from '../common/Badge'

type Props = {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: Props) {
  const [hover, setHover] = useState(false)
  const openCart = useUiStore((s) => s.openCart)
  const openQuickView = useUiStore((s) => s.openQuickView)
  const addLine = useCartStore((s) => s.addLine)
  const toggleWish = useWishlistStore((s) => s.toggle)
  const wishHas = useWishlistStore(selectWishlistHas(product.id))

  const images = product.images ?? []
  const tags = product.tags ?? []
  const sizes = product.sizes ?? []
  const colors = product.colors ?? []
  const imgA = images[0]
  const imgB = images[1] ?? images[0]
  const hasImage = Boolean(imgA)
  const price = product.salePrice ?? product.price
  const compare = product.salePrice ? product.price : null

  function quickAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    const size = sizes[0] ?? 'One Size'
    const color = colors[0]?.name ?? 'Default'
    addLine(product, size, color, 1)
    openCart()
  }

  function onWishlistClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    toggleWish(product.id)
  }

  function onOpenQuickView() {
    openQuickView(product)
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={cn('relative', className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative">
        <motion.div
          role="button"
          tabIndex={0}
          onClick={onOpenQuickView}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenQuickView()
            }
          }}
          className="group/card block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label={`Quick view ${product.name}`}
          aria-haspopup="dialog"
        >
          <div className="relative aspect-[3/4] overflow-hidden bg-[var(--surface-muted)]">
            {hasImage ? (
              <>
                <motion.img
                  src={imgA}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  animate={{ opacity: hover ? 0 : 1, scale: hover ? 1.05 : 1 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  loading="lazy"
                />
                <motion.img
                  src={imgB}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  animate={{ opacity: hover ? 1 : 0, scale: hover ? 1.05 : 1 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  loading="lazy"
                />
              </>
            ) : null}
            {tags.includes('new') ? (
              <span className="pointer-events-none absolute left-3 top-3">
                <Badge>New</Badge>
              </span>
            ) : null}

            <div
              className={cn(
                'absolute inset-x-0 bottom-0 flex justify-center pb-3 md:pb-4',
                'max-md:opacity-100',
                'md:translate-y-2 md:opacity-0 md:pointer-events-none md:transition md:duration-300 md:group-hover/card:pointer-events-auto md:group-hover/card:translate-y-0 md:group-hover/card:opacity-100',
              )}
            >
              <button
                type="button"
                onClick={quickAdd}
                className="flex items-center gap-2 border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--text-primary)] shadow-sm backdrop-blur transition hover:bg-[var(--surface-elevated)]"
              >
                <HiOutlineShoppingBag className="h-4 w-4" />
                Quick add
              </button>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-[var(--text-primary)] transition group-hover/card:opacity-80">
              {product.name}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {product.category?.replace('-', ' ') ?? 'Collection'}
            </p>
          </div>
          <motion.div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">{formatPrice(price)}</span>
            {compare ? (
              <span className="text-xs tabular-nums text-[var(--text-muted)] line-through">{formatPrice(compare)}</span>
            ) : null}
          </motion.div>
        </motion.div>

        <button
          type="button"
          aria-label={wishHas ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={onWishlistClick}
          className={cn(
            'absolute right-0 top-0 z-10 rounded-full p-2 transition md:right-1 md:top-1',
            wishHas ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            'border border-[var(--border-subtle)] bg-[var(--surface-overlay)] shadow-sm backdrop-blur hover:bg-[var(--surface-elevated)]',
          )}
        >
          <HiOutlineHeart className={cn('h-5 w-5', wishHas && 'fill-[var(--text-primary)]')} />
        </button>
      </div>
    </motion.article>
  )
}
