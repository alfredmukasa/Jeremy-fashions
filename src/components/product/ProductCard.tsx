import type { MouseEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HiOutlineHeart, HiOutlineShoppingBag } from 'react-icons/hi2'

import { ROUTES } from '../../constants'
import type { Product } from '../../types'
import { useCartStore } from '../../store/cartStore'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore } from '../../store/wishlistStore'
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
  const addLine = useCartStore((s) => s.addLine)
  const toggleWish = useWishlistStore((s) => s.toggle)
  const wishHas = useWishlistStore((s) => s.has(product.id))

  const imgA = product.images[0]
  const imgB = product.images[1] ?? product.images[0]
  const price = product.salePrice ?? product.price
  const compare = product.salePrice ? product.price : null

  function quickAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    const size = product.sizes[0]
    const color = product.colors[0].name
    addLine(product.id, size, color, 1)
    openCart()
  }

  function onWishlistClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    toggleWish(product.id)
  }

  const href = ROUTES.product(product.slug)

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
        <Link
          to={href}
          className="group/card block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
          aria-label={`View ${product.name}`}
        >
          <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
            <motion.img
              src={imgA}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              animate={{ opacity: hover ? 0 : 1 }}
              transition={{ duration: 0.45 }}
              loading="lazy"
            />
            <motion.img
              src={imgB}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              animate={{ opacity: hover ? 1 : 0 }}
              transition={{ duration: 0.45 }}
              loading="lazy"
            />
            {product.tags.includes('new') ? (
              <span className="pointer-events-none absolute left-3 top-3">
                <Badge>New</Badge>
              </span>
            ) : null}

            {/* Quick add: always tappable on touch; hover-reveal on desktop */}
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
                className="flex items-center gap-2 border border-white/40 bg-white/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-950 shadow-sm backdrop-blur hover:bg-white"
              >
                <HiOutlineShoppingBag className="h-4 w-4" />
                Quick add
              </button>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-950 group-hover/card:underline">{product.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-neutral-500">
              {product.category.replace('-', ' ')}
            </p>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-medium tabular-nums text-neutral-950">{formatPrice(price)}</span>
            {compare ? (
              <span className="text-xs tabular-nums text-neutral-400 line-through">{formatPrice(compare)}</span>
            ) : null}
          </div>
        </Link>

        <button
          type="button"
          aria-label={wishHas ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={onWishlistClick}
          className={cn(
            'absolute right-0 top-0 z-10 rounded-full p-2 transition md:right-1 md:top-1',
            wishHas ? 'text-neutral-950' : 'text-neutral-500 hover:text-neutral-900',
            'bg-white/90 shadow-sm ring-1 ring-neutral-200/80 hover:bg-white',
          )}
        >
          <HiOutlineHeart className={cn('h-5 w-5', wishHas && 'fill-neutral-950')} />
        </button>
      </div>
    </motion.article>
  )
}
