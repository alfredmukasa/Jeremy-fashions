import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { ROUTES } from '../../constants'
import { products } from '../../data/products'
import { mockAddresses, mockOrders, mockUser } from '../../data/users'
import { useWishlistStore } from '../../store/wishlistStore'
import { formatPrice } from '../../utils/formatPrice'

import { Badge } from '../../components/common/Badge'
import { Container } from '../../components/layout/Container'
import { ProductGrid } from '../../components/product/ProductGrid'
import { FieldLabel, Input, Textarea } from '../../components/common/Input'
import { Button } from '../../components/common/Button'

export default function AccountDashboardPage() {
  const ids = useWishlistStore((s) => s.ids)
  const wishProducts = products.filter((p) => ids.includes(p.id))

  return (
    <div className="pb-24">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-14 md:py-16">
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Account</p>
          <h1 className="mt-3 font-serif text-4xl text-neutral-950 md:text-5xl">Studio dashboard</h1>
          <p className="mt-3 max-w-xl text-sm text-neutral-600">
            Mock data for orders and addresses — swap with API responses when the backend lands.
          </p>
        </Container>
      </div>

      <Container className="py-12 md:py-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Name', value: mockUser.name },
            { label: 'Email', value: mockUser.email },
            { label: 'Phone', value: mockUser.phone },
            { label: 'Member ID', value: mockUser.id.toUpperCase() },
          ].map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border border-neutral-200 bg-white p-6"
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">{row.label}</p>
              <p className="mt-2 text-sm font-medium text-neutral-950">{row.value}</p>
            </motion.div>
          ))}
        </div>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-serif text-2xl text-neutral-950 md:text-3xl">Order history</h2>
            <Link
              to={ROUTES.shop}
              className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-600 underline-offset-8 hover:underline"
            >
              Continue shopping
            </Link>
          </div>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                  <th className="pb-3 font-medium">Order</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Items</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {mockOrders.map((o) => (
                  <tr key={o.id} className="text-neutral-800">
                    <td className="py-4 font-medium">{o.id}</td>
                    <td className="py-4 text-neutral-600">{o.date}</td>
                    <td className="py-4">
                      <Badge className="border-neutral-800 text-neutral-800">{o.status}</Badge>
                    </td>
                    <td className="py-4 tabular-nums">{o.items}</td>
                    <td className="py-4 text-right tabular-nums font-medium">{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="font-serif text-2xl text-neutral-950 md:text-3xl">Saved addresses</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {mockAddresses.map((a) => (
              <div key={a.id} className="border border-neutral-200 p-6">
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">{a.label}</p>
                <p className="mt-3 text-sm leading-relaxed text-neutral-800">
                  {a.line1}
                  {a.line2 ? <><br />{a.line2}</> : null}
                  <br />
                  {a.city}, {a.region} {a.postal}
                  <br />
                  {a.country}
                </p>
                <button type="button" className="mt-4 text-[11px] uppercase tracking-[0.2em] text-neutral-500 hover:text-neutral-900">
                  Edit (demo)
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-serif text-2xl text-neutral-950 md:text-3xl">Wishlist</h2>
            <Link to={`${ROUTES.shop}?wishlist=1`} className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-600">
              View in shop
            </Link>
          </div>
          {wishProducts.length ? (
            <ProductGrid products={wishProducts} className="mt-10" />
          ) : (
            <p className="mt-8 text-sm text-neutral-600">No saved pieces yet — tap the heart on a product card.</p>
          )}
        </section>

        <section className="mt-20 border-t border-neutral-200 pt-16">
          <h2 className="font-serif text-2xl text-neutral-950 md:text-3xl">Profile settings</h2>
          <p className="mt-2 text-sm text-neutral-600">Form state is local-only for presentation.</p>
          <form
            className="mt-8 grid max-w-xl gap-6"
            onSubmit={(e) => {
              e.preventDefault()
            }}
          >
            <div>
              <FieldLabel id="dn">Display name</FieldLabel>
              <Input id="dn" defaultValue={mockUser.name} />
            </div>
            <div>
              <FieldLabel id="em">Email</FieldLabel>
              <Input id="em" type="email" defaultValue={mockUser.email} />
            </div>
            <div>
              <FieldLabel id="bio">Notes</FieldLabel>
              <Textarea id="bio" placeholder="Fit preferences, sizing notes…" />
            </div>
            <Button type="submit" variant="outline" className="w-fit">
              Save changes (demo)
            </Button>
          </form>
        </section>
      </Container>
    </div>
  )
}
