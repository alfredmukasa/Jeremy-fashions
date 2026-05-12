import { useState } from 'react'
import { motion } from 'framer-motion'

import type { Product } from '../../types'
import { cn } from '../../utils/cn'

type Props = {
  product: Product
}

export function ProductGallery({ product }: Props) {
  const [selection, setSelection] = useState({ productId: product.id, index: 0 })
  const index = selection.productId === product.id ? selection.index : 0
  const images = product.images ?? []
  const main = images[index] ?? images[0]
  const hasImage = Boolean(main)

  return (
    <div className="space-y-4">
      <motion.div
        key={main ?? product.id}
        initial={{ opacity: 0.85 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="aspect-[3/4] overflow-hidden bg-neutral-100"
      >
        {hasImage ? <img src={main} alt={product.name} className="h-full w-full object-cover" loading="eager" /> : null}
      </motion.div>
      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setSelection({ productId: product.id, index: i })}
              className={cn(
                'aspect-square overflow-hidden border bg-neutral-50 transition',
                i === index ? 'border-neutral-900' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
