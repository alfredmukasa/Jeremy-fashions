import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useProducts } from '../../hooks/useCatalog'
import { pickCompleteTheSet } from '../../lib/completeTheSet'
import { useCartStore } from '../../store/cartStore'
import { formatPrice } from '../../utils/formatPrice'
import { cn } from '../../utils/cn'

import { Button } from '../common/Button'

function CompleteTheSetCard({ product }: { product: NonNullable<ReturnType<typeof pickCompleteTheSet>> }) {
  const addLine = useCartStore((state) => state.addLine)
  const sizes = product.sizes ?? []
  const colors = product.colors ?? []
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : '')
  const [color, setColor] = useState(colors[0]?.name ?? '')
  const [sizeError, setSizeError] = useState<string | null>(null)

  const unit = product.salePrice ?? product.price
  const compare = product.salePrice ? product.price : null
  const selectedColor = colors.find((entry) => entry.name === color) ?? colors[0]

  function addPiece() {
    if (sizes.length > 0 && !size) {
      setSizeError('Select a size before adding this piece.')
      return
    }
    setSizeError(null)
    addLine(product, size, color, 1)
    toast.success(`${product.name} added to your bag.`)
  }

  return (
    <section className="border-t border-neutral-200 pt-6" aria-label="Complete the set">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Complete the set</h3>
      <div className="mt-4 flex gap-3">
        <Link
          to={ROUTES.product(product.slug)}
          className="h-24 w-[4.5rem] shrink-0 overflow-hidden bg-neutral-100"
        >
          <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link
              to={ROUTES.product(product.slug)}
              className="line-clamp-2 text-sm font-medium text-neutral-950 hover:underline"
            >
              {product.name}
            </Link>
            <Button type="button" className="shrink-0 px-4 py-2" onClick={addPiece}>
              Add
            </Button>
          </div>
          <p className="mt-1 text-sm tabular-nums text-neutral-950">
            <span className="font-medium">{formatPrice(unit)}</span>
            {compare ? (
              <span className="ml-2 text-neutral-400 line-through">{formatPrice(compare)}</span>
            ) : null}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {sizes.length > 1 ? (
              <label className="text-xs text-neutral-600">
                <span className="sr-only">Size</span>
                <select
                  value={size}
                  onChange={(event) => {
                    setSize(event.target.value)
                    setSizeError(null)
                  }}
                  className="border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-950"
                  aria-invalid={Boolean(sizeError)}
                >
                  <option value="">Size</option>
                  {sizes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : sizes.length === 1 ? (
              <span className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-950">
                <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Size</span>
                <span className="font-medium">{sizes[0]}</span>
              </span>
            ) : null}
            {colors.length > 1 ? (
              <label className="text-xs text-neutral-600">
                <span className="sr-only">Color</span>
                <select
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-950"
                >
                  {colors.map((entry) => (
                    <option key={entry.name} value={entry.name}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : selectedColor ? (
              <span className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-950">
                <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Color</span>
                <span
                  className="h-3 w-3 rounded-full border border-neutral-300"
                  style={{ backgroundColor: selectedColor.hex }}
                  aria-hidden
                />
                <span className="font-medium">{selectedColor.name}</span>
              </span>
            ) : null}
          </div>
          {sizeError ? (
            <p className="mt-2 text-xs text-rose-700" role="alert">
              {sizeError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function CompleteTheSet({ className }: { className?: string }) {
  const lines = useCartStore((state) => state.lines)
  const { data: products } = useProducts()
  const suggestion = useMemo(
    () => (products?.length ? pickCompleteTheSet(products, lines) : null),
    [lines, products],
  )

  if (!suggestion) return null

  return (
    <div className={cn(className)}>
      <CompleteTheSetCard key={suggestion.id} product={suggestion} />
    </div>
  )
}
