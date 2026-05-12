import { emptyAttributesForKind, resolveProductKind } from '../../lib/productCategoryConfig'
import type { AdminProductPayload } from '../../services/adminService'
import type { ProductRow } from '../../services/mappers'
import type { Product, ProductAttributes, ProductKind } from '../../types'

export function emptyProductPayload(categorySlug: string, productKind: ProductKind = 'apparel'): AdminProductPayload {
  return {
    title: '',
    slug: '',
    description: '',
    price: 0,
    compare_price: null,
    category: categorySlug,
    brand: '',
    stock_quantity: 0,
    featured: false,
    rating: 0,
    image_url: '',
    gallery_images: [],
    tags: [],
    sku: '',
    status: 'active',
    gender: 'unisex',
    sizes: [],
    colors: [{ name: 'Default', hex: '#1a1a1a' }],
    attributes: emptyAttributesForKind(productKind),
  }
}

export function productRowToPayload(row: ProductRow): AdminProductPayload {
  const gallery = Array.isArray(row.gallery_images) ? row.gallery_images : []
  const tags = Array.isArray(row.tags) ? row.tags : []
  const sizes = Array.isArray(row.sizes) ? row.sizes : []
  const colors = Array.isArray(row.colors)
    ? (row.colors as { name?: string; hex?: string }[]).map((c) => ({
        name: typeof c?.name === 'string' ? c.name : 'Default',
        hex: typeof c?.hex === 'string' ? c.hex : '#1a1a1a',
      }))
    : [{ name: 'Default', hex: '#1a1a1a' }]

  const kind = resolveProductKind(row.category)
  const attributes =
    row.attributes && typeof row.attributes === 'object' && !Array.isArray(row.attributes)
      ? (row.attributes as ProductAttributes)
      : emptyAttributesForKind(kind)

  return {
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    price: Number(row.price),
    compare_price: row.compare_price == null ? null : Number(row.compare_price),
    category: row.category,
    brand: row.brand ?? '',
    stock_quantity: row.stock_quantity ?? 0,
    featured: row.featured ?? false,
    rating: Number(row.rating ?? 0),
    image_url: row.image_url,
    gallery_images: gallery.filter((s): s is string => typeof s === 'string'),
    tags: tags.filter((s): s is string => typeof s === 'string'),
    sku: row.sku ?? '',
    status: (row.status as AdminProductPayload['status']) || 'active',
    gender: row.gender === 'men' || row.gender === 'women' ? row.gender : 'unisex',
    sizes: sizes.filter((s): s is string => typeof s === 'string'),
    colors: colors.length ? colors : [{ name: 'Default', hex: '#1a1a1a' }],
    attributes,
  }
}

export function productPayloadToPreview(form: AdminProductPayload, id = 'preview', productKind?: ProductKind): Product {
  const kind = productKind ?? resolveProductKind(form.category)
  const images = [form.image_url, ...form.gallery_images]
    .map((url) => url.trim())
    .filter(Boolean)

  return {
    id,
    name: form.title.trim() || 'Untitled product',
    slug: form.slug.trim() || 'preview',
    description: form.description,
    category: form.category,
    productKind: kind,
    gender: form.gender,
    sizes: form.sizes,
    colors: form.colors,
    attributes: form.attributes,
    price: form.price,
    salePrice: form.compare_price == null ? undefined : form.compare_price,
    rating: form.rating,
    images,
    stock: form.stock_quantity,
    tags: form.tags,
    featured: form.featured,
    brand: form.brand || undefined,
    sku: form.sku || undefined,
  }
}
