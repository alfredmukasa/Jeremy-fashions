import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { useCartStore } from '../../store/cartStore'
import { formatPrice } from '../../utils/formatPrice'

import { Button } from '../../components/common/Button'
import { Container } from '../../components/layout/Container'

export default function CartPage() {
  const lines = useCartStore((s) => s.lines)
  const updateQty = useCartStore((s) => s.updateQuantity)
  const removeLine = useCartStore((s) => s.removeLine)
  const subtotal = useCartStore((s) => s.subtotal())

  return (
    <div className="pb-24">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-14 md:py-16">
          <h1 className="font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">Your bag</h1>
          <p className="mt-3 text-sm text-neutral-600">Review pieces before checkout — all demo, no charges.</p>
        </Container>
      </div>

      <Container className="py-12 md:py-16">
        {lines.length === 0 ? (
          <div className="mx-auto max-w-lg py-20 text-center">
            <p className="text-neutral-600">Your bag is empty.</p>
            <Link to={ROUTES.shop}>
              <Button className="mt-8">Browse the collection</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            <ul className="divide-y divide-neutral-200 border-t border-neutral-200">
              {lines.map((line) => {
                const { snapshot } = line
                const unit = snapshot.unitPrice
                return (
                  <li key={line.key} className="flex flex-col gap-6 py-10 sm:flex-row">
                    <Link
                      to={ROUTES.product(snapshot.slug)}
                      className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 sm:h-44 sm:w-36 sm:shrink-0"
                    >
                      <img src={snapshot.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link
                            to={ROUTES.product(snapshot.slug)}
                            className="font-medium text-neutral-950 hover:underline"
                          >
                            {snapshot.name}
                          </Link>
                          <p className="mt-2 text-xs text-neutral-500">
                            {line.colorName} · Size {line.size}
                          </p>
                        </div>
                        <p className="text-sm font-medium tabular-nums text-neutral-950">
                          {formatPrice(unit * line.quantity)}
                        </p>
                      </div>
                      <div className="mt-6 flex flex-wrap items-center gap-4">
                        <div className="inline-flex items-center border border-neutral-300">
                          <button
                            type="button"
                            className="px-3 py-2 text-sm"
                            onClick={() => updateQty(line.key, line.quantity - 1)}
                          >
                            −
                          </button>
                          <span className="px-4 text-xs tabular-nums">{line.quantity}</span>
                          <button
                            type="button"
                            className="px-3 py-2 text-sm"
                            onClick={() => updateQty(line.key, line.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className="text-xs uppercase tracking-[0.2em] text-neutral-500 hover:text-neutral-900"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <aside className="h-fit border border-neutral-200 bg-neutral-50 p-8">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Summary</p>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-neutral-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Shipping</span>
                  <span className="text-neutral-500">Calculated next</span>
                </div>
              </div>
              <div className="my-6 border-t border-neutral-200 pt-6">
                <label className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
                  Coupon
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    placeholder="Code"
                    className="flex-1 border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
                  />
                  <Button type="button" variant="outline" className="shrink-0 px-4 py-2 text-[10px]">
                    Apply
                  </Button>
                </div>
                <p className="mt-2 text-xs text-neutral-400">Promo UI only — no validation in MVP.</p>
              </div>
              <div className="flex items-center justify-between text-base font-medium">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <Link to={ROUTES.checkout} className="mt-8 block">
                <Button className="w-full">Proceed to checkout</Button>
              </Link>
              <Link
                to={ROUTES.shop}
                className="mt-4 block text-center text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-600 underline-offset-8 hover:underline"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </Container>
    </div>
  )
}
