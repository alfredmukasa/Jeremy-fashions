import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineTrash, HiOutlineXMark } from 'react-icons/hi2'

import { ROUTES } from '../../constants'
import { products } from '../../data/products'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useCartStore } from '../../store/cartStore'
import { useUiStore } from '../../store/uiStore'
import { formatPrice } from '../../utils/formatPrice'
import { cn } from '../../utils/cn'

import { Button } from '../common/Button'

export function CartDrawer() {
  const open = useUiStore((s) => s.cartOpen)
  const setOpen = useUiStore((s) => s.setCartOpen)
  const lines = useCartStore((s) => s.lines)
  const updateQty = useCartStore((s) => s.updateQuantity)
  const removeLine = useCartStore((s) => s.removeLine)
  const subtotal = useCartStore((s) => s.subtotal())
  const navigate = useNavigate()
  useBodyScrollLock(open)

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[90] flex w-[min(480px,100%)] flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">
                  Bag
                </p>
                <p className="mt-1 font-serif text-2xl text-neutral-950">{lines.length} items</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="p-2 text-neutral-600 hover:text-neutral-900"
              >
                <HiOutlineXMark className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {lines.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-neutral-600">Your bag is empty.</p>
              <Link
                to={ROUTES.shop}
                onClick={() => setOpen(false)}
                className="mt-6 inline-flex w-full items-center justify-center border border-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 transition hover:bg-neutral-950 hover:text-white"
              >
                Continue shopping
              </Link>
                </div>
              ) : (
                <ul className="space-y-6">
                  {lines.map((line) => {
                    const product = products.find((p) => p.id === line.productId)
                    if (!product) return null
                    const unit = product.salePrice ?? product.price
                    return (
                      <li key={line.key} className="flex gap-4">
                        <Link
                          to={ROUTES.product(product.slug)}
                          onClick={() => setOpen(false)}
                          className="relative h-28 w-24 shrink-0 overflow-hidden bg-neutral-100"
                        >
                          <img
                            src={product.images[0]}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={ROUTES.product(product.slug)}
                            onClick={() => setOpen(false)}
                            className="font-medium text-neutral-900 hover:underline"
                          >
                            {product.name}
                          </Link>
                          <p className="mt-1 text-xs text-neutral-500">
                            {line.colorName} / {line.size}
                          </p>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="inline-flex items-center border border-neutral-300">
                              <button
                                type="button"
                                className="px-2 py-1 text-sm"
                                onClick={() => updateQty(line.key, line.quantity - 1)}
                              >
                                −
                              </button>
                              <span className="px-3 text-xs tabular-nums">{line.quantity}</span>
                              <button
                                type="button"
                                className="px-2 py-1 text-sm"
                                onClick={() => updateQty(line.key, line.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              aria-label="Remove"
                              onClick={() => removeLine(line.key)}
                              className="text-neutral-400 hover:text-neutral-800"
                            >
                              <HiOutlineTrash className="h-5 w-5" />
                            </button>
                          </div>
                          <p className="mt-2 text-sm font-medium tabular-nums text-neutral-900">
                            {formatPrice(unit * line.quantity)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-neutral-200 px-6 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="uppercase tracking-[0.2em] text-neutral-500">Subtotal</span>
                <span className="text-lg font-medium tabular-nums text-neutral-950">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-500">Shipping and taxes calculated at checkout.</p>
              <Button
                className={cn('mt-5 w-full', lines.length === 0 && 'pointer-events-none opacity-40')}
                onClick={() => {
                  if (lines.length === 0) return
                  setOpen(false)
                  navigate(ROUTES.checkout)
                }}
              >
                Checkout
              </Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 w-full text-center text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-600 underline-offset-4 hover:underline"
              >
                Keep browsing
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
