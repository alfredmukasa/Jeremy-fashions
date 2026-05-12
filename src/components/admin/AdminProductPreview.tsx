import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import type { Product } from '../../types'
import { formatPrice } from '../../utils/formatPrice'

type AdminProductPreviewProps = {
  product: Product
  storefrontReady: boolean
}

export function AdminProductPreview({ product, storefrontReady }: AdminProductPreviewProps) {
  const featuredImage = product.images[0]
  const hoverImage = product.images[1] ?? featuredImage
  const price = product.salePrice ?? product.price
  const compare = product.salePrice ? product.price : null

  return (
    <section className="border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Storefront preview</p>
        {storefrontReady ? (
          <Link
            to={ROUTES.product(product.slug)}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-900 underline-offset-4 hover:underline"
          >
            Open product
          </Link>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden border border-neutral-200 bg-white">
        <div className="relative aspect-[3/4] bg-neutral-100">
          {featuredImage ? (
            <>
              <img src={featuredImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
              {hoverImage && hoverImage !== featuredImage ? (
                <img
                  src={hoverImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 hover:opacity-100"
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-neutral-400">
              Featured image
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{product.category || 'Category'}</p>
            <h4 className="mt-1 font-serif text-xl text-neutral-950">{product.name}</h4>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-medium text-neutral-950">{formatPrice(price)}</p>
            {compare != null ? <p className="text-sm text-neutral-400 line-through">{formatPrice(compare)}</p> : null}
          </div>
          {Object.values(product.attributes).some((value) => value?.trim()) ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Details</p>
              <div className="mt-2 space-y-1 text-xs text-neutral-600">
                {Object.entries(product.attributes)
                  .filter(([, value]) => value?.trim())
                  .map(([key, value]) => (
                    <p key={key}>
                      <span className="font-medium text-neutral-800">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}:
                      </span>{' '}
                      {value}
                    </p>
                  ))}
              </div>
            </div>
          ) : null}
          {product.sizes.length ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Sizes</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <span key={size} className="border border-neutral-300 px-2 py-1 text-xs text-neutral-700">
                    {size}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">No sizes selected yet.</p>
          )}
          {product.images.length > 1 ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Gallery</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {product.images.slice(0, 8).map((image, index) => (
                  <div key={`${image}-${index}`} className="aspect-square overflow-hidden border border-neutral-200 bg-neutral-100">
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
