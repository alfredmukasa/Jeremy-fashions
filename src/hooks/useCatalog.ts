import { useCallback, useEffect, useState } from 'react'

import {
  getCategories,
  getFeaturedProducts,
  getProductBySlug,
  getProducts,
  getRelatedProducts,
} from '../services/productService'
import type { Category, Product } from '../types'

type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}

type InternalState<T> = AsyncState<T> & {
  key: string | null
}

type Fetcher<T> = () => Promise<T>

const PRODUCTS_KEY = 'products:all'
const CATEGORIES_KEY = 'categories:all'

const promiseCache = new Map<string, Promise<unknown>>()
const dataCache = new Map<string, unknown>()

const EMPTY_STATE: AsyncState<unknown> = { data: null, loading: false, error: null }

/**
 * Manually invalidate a cached fetch (used by tests / admin flows).
 * Re-renders that depend on the key will re-fetch on next mount.
 */
export function invalidateCatalog(prefix?: string) {
  if (!prefix) {
    promiseCache.clear()
    dataCache.clear()
    return
  }
  for (const key of promiseCache.keys()) {
    if (key.startsWith(prefix)) promiseCache.delete(key)
  }
  for (const key of dataCache.keys()) {
    if (key.startsWith(prefix)) dataCache.delete(key)
  }
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

function productKey(slug: string) {
  return `products:slug:${slug}`
}

function primeProductCache(products: Product[]) {
  dataCache.set(PRODUCTS_KEY, products)
  for (const product of products) {
    dataCache.set(productKey(product.slug), product)
  }
}

function getCachedProductBySlug(slug: string): Product | null | undefined {
  const cached = dataCache.get(productKey(slug)) as Product | null | undefined
  if (cached !== undefined) return cached

  const products = dataCache.get(PRODUCTS_KEY) as Product[] | undefined
  return products?.find((p) => p.slug === slug)
}

function snapshotForKey<T>(key: string | null): InternalState<T> {
  if (key === null) {
    return { key, data: null, loading: false, error: null }
  }

  if (dataCache.has(key)) {
    return { key, data: dataCache.get(key) as T, loading: false, error: null }
  }

  return { key, data: null, loading: true, error: null }
}

function readCached<T>(key: string): T | undefined {
  return dataCache.get(key) as T | undefined
}

function fetchCached<T>(key: string, fn: Fetcher<T>): Promise<T> {
  const cached = readCached<T>(key)
  if (cached !== undefined) return Promise.resolve(cached)

  const pending = promiseCache.get(key) as Promise<T> | undefined
  if (pending) return pending

  const promise = fn()
    .then((data) => {
      dataCache.set(key, data)
      return data
    })
    .catch((err: unknown) => {
      if (promiseCache.get(key) === promise) {
        promiseCache.delete(key)
      }
      throw toError(err)
    })

  promiseCache.set(key, promise as Promise<unknown>)
  return promise
}

export function preloadCatalog() {
  void fetchCached(PRODUCTS_KEY, async () => {
    const products = await getProducts()
    primeProductCache(products)
    return products
  }).catch(() => undefined)

  void fetchCached(CATEGORIES_KEY, getCategories).catch(() => undefined)
}

function useAsync<T>(key: string | null, fn: Fetcher<T>): AsyncState<T> {
  const [state, setState] = useState<InternalState<T>>(() => snapshotForKey<T>(key))
  const renderState = state.key === key ? state : snapshotForKey<T>(key)

  if (renderState.key !== null && renderState.data !== null && !dataCache.has(renderState.key)) {
    dataCache.set(renderState.key, renderState.data)
  }

  useEffect(() => {
    if (key === null) {
      return
    }

    let cancelled = false

    const cached = readCached<T>(key)
    if (cached !== undefined) {
      queueMicrotask(() => {
        if (!cancelled) setState({ key, data: cached, loading: false, error: null })
      })
      return () => {
        cancelled = true
      }
    }

    const promise = fetchCached(key, fn)

    promise
      .then((data) => {
        if (!cancelled) setState({ key, data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            key,
            data: null,
            loading: false,
            error: toError(err),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [key, fn])

  if (key === null) {
    return EMPTY_STATE as AsyncState<T>
  }

  return {
    data: renderState.data,
    loading: renderState.loading,
    error: renderState.error,
  }
}

export function useProducts(): AsyncState<Product[]> {
  const fetcher = useCallback(async () => {
    const products = await getProducts()
    primeProductCache(products)
    return products
  }, [])

  return useAsync<Product[]>(PRODUCTS_KEY, fetcher)
}

export function useFeaturedProducts(limit = 6): AsyncState<Product[]> {
  const fetcher = useCallback(() => getFeaturedProducts(limit), [limit])
  return useAsync<Product[]>(`products:featured:${limit}`, fetcher)
}

export function useProduct(slug: string | undefined): AsyncState<Product | null> {
  const key = slug ? productKey(slug) : null
  if (slug && key && !dataCache.has(key)) {
    const cached = getCachedProductBySlug(slug)
    if (cached !== undefined) dataCache.set(key, cached)
  }

  const fetcher = useCallback(async () => {
    if (!slug) return null
    const cached = getCachedProductBySlug(slug)
    if (cached !== undefined) return cached
    const product = await getProductBySlug(slug)
    dataCache.set(productKey(slug), product)
    return product
  }, [slug])

  return useAsync<Product | null>(key, fetcher)
}

export function useRelatedProducts(product: Product | null, limit = 4): AsyncState<Product[]> {
  const key = product ? `products:related:${product.id}:${limit}` : null
  const fetcher = useCallback(() => getRelatedProducts(product as Product, limit), [product, limit])
  return useAsync<Product[]>(key, fetcher)
}

export function useCategories(): AsyncState<Category[]> {
  return useAsync<Category[]>(CATEGORIES_KEY, getCategories)
}
