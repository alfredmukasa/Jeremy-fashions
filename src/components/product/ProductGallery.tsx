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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="lg:sticky lg:top-[calc(var(--header-offset)+var(--announcement-height)+1.5rem)] lg:self-start"
    >
      <div className="group relative aspect-[3/4] overflow-hidden bg-[var(--surface-muted)] shadow-[var(--shadow-soft)]">
        <motion.div
          key={main ?? product.id}
          initial={{ opacity: 0.88 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="h-full w-full"
        >
          {hasImage ? (
            <img
              src={main}
              alt={product.name}
              className="image-zoom h-full w-full object-cover"
              loading="eager"
            />
          ) : null}
        </motion.div>
      </div>

      {images.length > 1 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5"
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setSelection({ productId: product.id, index: i })}
              className={cn(
                'group/thumb aspect-square overflow-hidden border bg-[var(--surface-muted)] transition duration-300',
                i === index
                  ? 'border-[var(--accent)] opacity-100'
                  : 'border-transparent opacity-65 hover:opacity-100',
              )}
            >
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover/thumb:scale-105"
                loading="lazy"
              />
            </button>
          ))}
        </motion.div>
      ) : null}
    </motion.div>
  )
}
