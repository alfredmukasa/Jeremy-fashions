import type { CartLine, Product } from '../../types'
import { useCartStore } from '../../store/cartStore'
import { cn } from '../../utils/cn'

type CheckoutLineOptionsProps = {
  line: CartLine
  product?: Product | null
  className?: string
}

function colorHex(product: Product | null | undefined, colorName: string) {
  const name = colorName.trim().toLowerCase()
  if (!product || !name) return undefined
  return product.colors.find((color) => color.name.trim().toLowerCase() === name)?.hex
}

export function CheckoutLineOptions({ line, product, className }: CheckoutLineOptionsProps) {
  const setLineVariant = useCartStore((state) => state.setLineVariant)
  const size = line.size.trim()
  const colorName = line.colorName.trim()
  const needsSize = Boolean(product && product.sizes.length > 0 && !size)
  const hex = colorHex(product, colorName)

  return (
    <div className={cn('mt-2 flex flex-wrap items-center gap-2', className)}>
      {needsSize && product ? (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">Size</p>
          <div className="mt-1 flex flex-wrap gap-1" role="radiogroup" aria-label="Size">
            {product.sizes.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={false}
                onClick={() => setLineVariant(line.key, { size: option })}
                className="min-w-9 border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-950"
              >
                {option}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-rose-700">Choose a size before checkout.</p>
        </div>
      ) : size ? (
        <span className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-950">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">Size</span>
          <span className="font-medium">{size}</span>
        </span>
      ) : null}
      {colorName ? (
        <span className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-950">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">Color</span>
          {hex ? (
            <span
              className="h-3 w-3 rounded-full border border-neutral-300"
              style={{ backgroundColor: hex }}
              aria-hidden
            />
          ) : null}
          <span className="font-medium">{colorName}</span>
        </span>
      ) : null}
    </div>
  )
}
