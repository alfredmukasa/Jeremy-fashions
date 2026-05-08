import type { Product } from '../../types'
import { cn } from '../../utils/cn'

import { ProductCard } from './ProductCard'

export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
