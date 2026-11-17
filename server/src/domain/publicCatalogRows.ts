export type PublicProductRow = {
  id: string
  created_at: string
  title: string
  slug: string
  description: string
  price: string
  compare_price: string | null
  category: string
  brand: string | null
  stock_quantity: number
  featured: boolean
  rating: string
  image_url: string
  gallery_images: string[]
  tags: string[]
  sku: string | null
  status: string
  gender: string
  sizes: string[]
  colors: unknown
  attributes: unknown
}

export type PublicCategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  product_kind: string | null
}

export type PublicSiteSetting = {
  key: string
  value: unknown
  updated_at: string | null
}

export function parseJsonValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return raw
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return raw
  }
}

function stringList(raw: unknown): string[] {
  const parsed = parseJsonValue(raw)
  if (!Array.isArray(parsed)) return []
  return parsed.filter((item): item is string => typeof item === 'string')
}

function text(raw: unknown): string {
  return typeof raw === 'string' ? raw : raw == null ? '' : String(raw)
}

function textOrNull(raw: unknown): string | null {
  if (raw == null) return null
  const value = text(raw).trim()
  return value.length > 0 ? value : null
}

export function normalizeProductRow(row: Record<string, unknown>): PublicProductRow {
  const featured = row.featured === true || row.featured === 1 || row.featured === '1'
  const stock = typeof row.stock_quantity === 'number' ? row.stock_quantity : Number(row.stock_quantity ?? 0)

  return {
    id: text(row.id),
    created_at: text(row.created_at),
    title: text(row.title),
    slug: text(row.slug),
    description: text(row.description),
    price: text(row.price),
    compare_price: textOrNull(row.compare_price),
    category: text(row.category),
    brand: textOrNull(row.brand),
    stock_quantity: Number.isFinite(stock) ? stock : 0,
    featured,
    rating: text(row.rating || '0'),
    image_url: text(row.image_url),
    gallery_images: stringList(row.gallery_images),
    tags: stringList(row.tags),
    sku: textOrNull(row.sku),
    status: text(row.status),
    gender: text(row.gender || 'unisex'),
    sizes: stringList(row.sizes),
    colors: parseJsonValue(row.colors) ?? [],
    attributes: parseJsonValue(row.attributes) ?? {},
  }
}

export function normalizeCategoryRow(row: Record<string, unknown>): PublicCategoryRow {
  return {
    id: text(row.id),
    name: text(row.name),
    slug: text(row.slug),
    description: textOrNull(row.description),
    image_url: textOrNull(row.image_url),
    product_kind: textOrNull(row.product_kind),
  }
}

export function normalizeSiteSetting(row: { key?: unknown; value?: unknown; updated_at?: unknown }): PublicSiteSetting {
  return {
    key: text(row.key),
    value: parseJsonValue(row.value),
    updated_at: textOrNull(row.updated_at),
  }
}
