import type { Category, Product, ProductAttributes, ProductColor, ProductKind } from '../types'
import { resolveProductKind } from '../lib/productCategoryConfig'

/**
 * Raw row shape returned by Supabase for the `products` table.
 * Kept intentionally permissive — Supabase returns numerics as `number`
 * via the JS client, but we coerce defensively in case the API changes.
 */
export type ProductRow = {
  id: string
  created_at?: string
  title: string
  slug: string
  description: string | null
  price: number | string
  compare_price: number | string | null
  category: string
  brand: string | null
  stock_quantity: number | null
  featured: boolean | null
  rating: number | string | null
  image_url: string
  gallery_images: string[] | null
  tags: string[] | null
  sku: string | null
  status: string | null
  gender: string | null
  sizes: string[] | null
  colors: unknown
  attributes?: unknown
}

export type CategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  product_kind?: string | null
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

function parseColors(raw: unknown): ProductColor[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((c): c is { name: unknown; hex: unknown } => !!c && typeof c === 'object')
      .map((c) => ({
        name: typeof c.name === 'string' ? c.name : 'Default',
        hex: typeof c.hex === 'string' ? c.hex : '#1a1a1a',
      }))
  }
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      return parseColors(JSON.parse(raw))
    } catch {
      return []
    }
  }
  return []
}

function parseGender(raw: string | null): Product['gender'] {
  if (raw === 'men' || raw === 'women' || raw === 'unisex') return raw
  return 'unisex'
}

function stringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function parseAttributes(raw: unknown): ProductAttributes {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const source = raw as Record<string, unknown>
  const out: ProductAttributes = {}
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string' && value.trim()) {
      out[key as keyof ProductAttributes] = value.trim()
    }
  }
  return out
}

function parseProductKind(raw: string | null | undefined, categorySlug: string): ProductKind {
  return resolveProductKind(categorySlug, raw)
}

export function mapProductRow(row: ProductRow): Product {
  const gallery = stringArray(row.gallery_images)
  const images = [row.image_url, ...gallery].filter((s): s is string => typeof s === 'string' && s.length > 0)

  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.title,
    slug: row.slug,
    description: row.description ?? '',
    category: row.category,
    productKind: parseProductKind(null, row.category),
    gender: parseGender(row.gender),
    sizes: stringArray(row.sizes),
    colors: parseColors(row.colors),
    attributes: parseAttributes(row.attributes),
    price: toNumber(row.price),
    salePrice: row.compare_price == null ? undefined : toNumber(row.compare_price),
    rating: toNumber(row.rating),
    images,
    stock: row.stock_quantity ?? 0,
    tags: stringArray(row.tags),
    featured: row.featured ?? false,
    brand: row.brand ?? undefined,
    sku: row.sku ?? undefined,
  }
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    productKind: parseProductKind(row.product_kind, row.slug),
  }
}
