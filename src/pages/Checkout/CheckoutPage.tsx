import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { products } from '../../data/products'
import { useCartStore } from '../../store/cartStore'
import { formatPrice } from '../../utils/formatPrice'

import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import { Container } from '../../components/layout/Container'

export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines)
  const subtotal = useCartStore((s) => s.subtotal())
  const [method, setMethod] = useState<'card' | 'paypal'>('card')
  const [placed, setPlaced] = useState(false)

  if (placed) {
    return (
      <Container className="py-24 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Order preview</p>
        <h1 className="mt-4 font-serif text-4xl text-neutral-950">Thank you — demo only.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-neutral-600">
          No payment was processed. This screen demonstrates checkout layout readiness for Stripe or PayPal.
        </p>
        <Link to={ROUTES.shop}>
          <Button className="mt-10">Return to shop</Button>
        </Link>
      </Container>
    )
  }

  if (lines.length === 0) {
    return (
      <Container className="py-24 text-center">
        <h1 className="font-serif text-3xl text-neutral-950">Your bag is empty</h1>
        <Link to={ROUTES.shop}>
          <Button className="mt-8">Shop products</Button>
        </Link>
      </Container>
    )
  }

  const shipping = subtotal >= 250 ? 0 : 12
  const tax = Math.round(subtotal * 0.08 * 100) / 100
  const total = subtotal + shipping + tax

  return (
    <div className="pb-24">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-14 md:py-16">
          <h1 className="font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">Checkout</h1>
          <p className="mt-3 max-w-2xl text-sm text-neutral-600">
            Shipping and billing forms below are UI-only placeholders. Integrate your gateway when the backend is ready.
          </p>
        </Container>
      </div>

      <Container className="py-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
          <div className="space-y-12">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-900">Shipping</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel id="name">Full name</FieldLabel>
                  <Input id="name" autoComplete="name" placeholder="Jordan Avery" />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel id="line1">Address</FieldLabel>
                  <Input id="line1" autoComplete="address-line1" placeholder="451 Market Street" />
                </div>
                <div>
                  <FieldLabel id="city">City</FieldLabel>
                  <Input id="city" autoComplete="address-level2" />
                </div>
                <div>
                  <FieldLabel id="region">State / Region</FieldLabel>
                  <Input id="region" autoComplete="address-level1" />
                </div>
                <div>
                  <FieldLabel id="postal">Postal code</FieldLabel>
                  <Input id="postal" autoComplete="postal-code" />
                </div>
                <div>
                  <FieldLabel id="country">Country</FieldLabel>
                  <Input id="country" autoComplete="country-name" placeholder="United States" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-900">Billing</h2>
              <p className="mt-3 text-xs text-neutral-500">Same as shipping for this demo.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel id="card">Card number (placeholder)</FieldLabel>
                  <Input id="card" placeholder="4242 4242 4242 4242" />
                </div>
                <div>
                  <FieldLabel id="exp">Expiry</FieldLabel>
                  <Input id="exp" placeholder="MM / YY" />
                </div>
                <div>
                  <FieldLabel id="cvc">CVC</FieldLabel>
                  <Input id="cvc" placeholder="123" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-900">Payment method</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={
                    method === 'card'
                      ? 'border-neutral-950 bg-neutral-950 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white'
                      : 'border border-neutral-300 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-700'
                  }
                >
                  Stripe (placeholder)
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('paypal')}
                  className={
                    method === 'paypal'
                      ? 'border-neutral-950 bg-neutral-950 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white'
                      : 'border border-neutral-300 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-700'
                  }
                >
                  PayPal (placeholder)
                </button>
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                Connect Stripe Checkout or PayPal SDK on the server — this UI is intentionally non-functional.
              </p>
            </section>
          </div>

          <aside className="h-fit border border-neutral-200 bg-neutral-50 p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Order summary</p>
            <ul className="mt-6 space-y-4">
              {lines.map((line) => {
                const product = products.find((p) => p.id === line.productId)
                if (!product) return null
                const unit = product.salePrice ?? product.price
                return (
                  <li key={line.key} className="flex gap-3 text-sm">
                    <div className="h-16 w-14 shrink-0 overflow-hidden bg-white">
                      <img src={product.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-neutral-950">{product.name}</p>
                      <p className="text-xs text-neutral-500">
                        ×{line.quantity} · {line.colorName}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-neutral-800">{formatPrice(unit * line.quantity)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-8 space-y-2 border-t border-neutral-200 pt-6 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Shipping</span>
                <span className="tabular-nums">{shipping === 0 ? 'Complimentary' : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Estimated tax</span>
                <span className="tabular-nums">{formatPrice(tax)}</span>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-6 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
            <Button className="mt-8 w-full" onClick={() => setPlaced(true)}>
              Place order (demo)
            </Button>
            <Link
              to={ROUTES.cart}
              className="mt-4 block text-center text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-600 underline-offset-8 hover:underline"
            >
              Back to bag
            </Link>
          </aside>
        </div>
      </Container>
    </div>
  )
}
