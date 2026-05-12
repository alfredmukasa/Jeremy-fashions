import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Category, Product } from '../types'

import { mapCategoryRow, mapProductRow, type CategoryRow, type ProductRow } from './mappers'

const PRODUCT_COLUMNS =
  'id, title, slug, description, price, compare_price, category, brand, ' +
  'stock_quantity, featured, rating, image_url, gallery_images, tags, sku, ' +
  'status, gender, sizes, colors, attributes'

const CATEGORY_COLUMNS = 'id, name, slug, description, image_url, product_kind'
const QUERY_RETRIES = 2

type QueryError = {
  message: string
}

type QueryResult<T> = {
  data: T | null
  error: QueryError | null
}

function requireCatalogClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load catalog data.')
  }

  return supabase
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function runQuery<T>(
  label: string,
  query: () => PromiseLike<QueryResult<T>>,
): Promise<T | null> {
  let lastError: QueryError | null = null

  for (let attempt = 0; attempt <= QUERY_RETRIES; attempt += 1) {
    try {
      const { data, error } = await query()
      if (!error) return data
      lastError = error
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }

    if (attempt < QUERY_RETRIES) {
      await wait(180 * (attempt + 1))
    }
  }

  console.error(`[productService.${label}]`, lastError)
  throw new Error(lastError?.message ?? 'Catalog request failed.')
}

export async function getProducts(): Promise<Product[]> {
  const client = requireCatalogClient()

  const data = await runQuery('getProducts', () =>
    client
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  )

  return ((data ?? []) as unknown as ProductRow[]).map(mapProductRow)
}

export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  const client = requireCatalogClient()

  const data = await runQuery('getFeaturedProducts', () =>
    client
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('status', 'active')
      .eq('featured', true)
      .order('rating', { ascending: false })
      .limit(limit),
  )

  return ((data ?? []) as unknown as ProductRow[]).map(mapProductRow)
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!slug) return null

  const client = requireCatalogClient()

  const data = await runQuery('getProductBySlug', () =>
    client
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('slug', slug)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  )

  return data ? mapProductRow(data as unknown as ProductRow) : null
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const client = requireCatalogClient()

  try {
    const data = await runQuery('getRelatedProducts', () =>
      client
        .from('products')
        .select(PRODUCT_COLUMNS)
        .eq('status', 'active')
        .eq('category', product.category)
        .neq('id', product.id)
        .limit(limit),
    )

    return ((data ?? []) as unknown as ProductRow[]).map(mapProductRow)
  } catch {
    return []
  }
}

export async function getCategories(): Promise<Category[]> {
  const client = requireCatalogClient()

  const data = await runQuery('getCategories', () =>
    client
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .order('name', { ascending: true }),
  )

  return ((data ?? []) as unknown as CategoryRow[]).map(mapCategoryRow)
}
