import type { Product } from '../../types'
import { cn } from '../../utils/cn'

import { ProductCard } from './ProductCard'

export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  const list = products.filter(Boolean)

  return (
    <div
      className={cn(
        'grid grid-cols-2 product-grid-gap md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {list.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
