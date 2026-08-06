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

// -----------------------------------------------------------------------------
// localStorage persistence (stale-while-revalidate) for public catalog data only.
// Only PRODUCTS_KEY / CATEGORIES_KEY are ever written here — never account, order,
// or address data — so nothing user-specific or sensitive ends up in localStorage.
// A returning visitor (or a hard reload) paints instantly from the last-known catalog
// snapshot instead of blocking on a fresh Supabase round trip, then a background
// revalidation silently swaps in live data once it arrives.
// -----------------------------------------------------------------------------
const STORAGE_PREFIX = 'krewnox:catalog:v1:'
const PERSISTED_KEYS = new Set([PRODUCTS_KEY, CATEGORIES_KEY])
const MAX_PERSIST_AGE_MS = 24 * 60 * 60 * 1000 // ignore snapshots older than a day

type PersistedEnvelope<T> = { data: T; savedAt: number }

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readPersisted<T>(key: string): T | undefined {
  if (!storageAvailable()) return undefined
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return undefined
    const envelope = JSON.parse(raw) as PersistedEnvelope<T>
    if (Date.now() - envelope.savedAt > MAX_PERSIST_AGE_MS) return undefined
    return envelope.data
  } catch {
    return undefined
  }
}

function writePersisted(key: string, data: unknown) {
  if (!storageAvailable() || !PERSISTED_KEYS.has(key)) return
  try {
    const envelope: PersistedEnvelope<unknown> = { data, savedAt: Date.now() }
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(envelope))
  } catch {
    /* storage full/unavailable (private browsing etc.) — in-memory cache still works */
  }
}

function clearPersisted(prefix?: string) {
  if (!storageAvailable()) return
  try {
    const toRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i)
      if (!k || !k.startsWith(STORAGE_PREFIX)) continue
      if (!prefix || k.slice(STORAGE_PREFIX.length).startsWith(prefix)) toRemove.push(k)
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

// -----------------------------------------------------------------------------
// Tiny pub/sub so a background revalidation can push fresh data into components
// that already rendered from a cached (in-memory or hydrated) snapshot.
// -----------------------------------------------------------------------------
const listeners = new Map<string, Set<() => void>>()

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener())
}

function subscribe(key: string, listener: () => void) {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(listener)
  return () => {
    set!.delete(listener)
    if (set!.size === 0) listeners.delete(key)
  }
}

/**
 * Manually invalidate a cached fetch (used by tests / admin flows).
 * Re-renders that depend on the key will re-fetch on next mount.
 */
export function invalidateCatalog(prefix?: string) {
  if (!prefix) {
    promiseCache.clear()
    dataCache.clear()
    clearPersisted()
    return
  }
  for (const key of promiseCache.keys()) {
    if (key.startsWith(prefix)) promiseCache.delete(key)
  }
  for (const key of dataCache.keys()) {
    if (key.startsWith(prefix)) dataCache.delete(key)
  }
  clearPersisted(prefix)
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
      writePersisted(key, data)
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

/** Always hits the network and pushes the result to anyone already reading `key`. */
function revalidate<T>(key: string, fn: Fetcher<T>): Promise<T> {
  const promise = fn().then((data) => {
    dataCache.set(key, data)
    writePersisted(key, data)
    notify(key)
    return data
  })
  promiseCache.set(key, promise as Promise<unknown>)
  return promise
}

// Hydrate the in-memory cache from localStorage synchronously at module load, before
// any component mounts, so the very first render of a returning visitor can paint
// real catalog data instead of a loading skeleton.
const hydratedKeys = new Set<string>()
;(function hydrateFromStorage() {
  const persistedProducts = readPersisted<Product[]>(PRODUCTS_KEY)
  if (persistedProducts) {
    primeProductCache(persistedProducts)
    hydratedKeys.add(PRODUCTS_KEY)
  }

  const persistedCategories = readPersisted<Category[]>(CATEGORIES_KEY)
  if (persistedCategories) {
    dataCache.set(CATEGORIES_KEY, persistedCategories)
    hydratedKeys.add(CATEGORIES_KEY)
  }
})()

/**
 * Kicks off the products/categories fetch as early as possible (call once, at app
 * bootstrap) instead of waiting for a lazy-loaded route's component to mount. If a
 * hydrated-from-storage snapshot is already showing, this revalidates in the
 * background and pushes fresh data to mounted components via the pub/sub above.
 */
export function preloadCatalog() {
  const productsFetcher = async () => {
    const products = await getProducts()
    primeProductCache(products)
    return products
  }

  if (hydratedKeys.delete(PRODUCTS_KEY)) {
    void revalidate(PRODUCTS_KEY, productsFetcher).catch(() => undefined)
  } else if (!dataCache.has(PRODUCTS_KEY)) {
    void fetchCached(PRODUCTS_KEY, productsFetcher).catch(() => undefined)
  }

  if (hydratedKeys.delete(CATEGORIES_KEY)) {
    void revalidate(CATEGORIES_KEY, getCategories).catch(() => undefined)
  } else if (!dataCache.has(CATEGORIES_KEY)) {
    void fetchCached(CATEGORIES_KEY, getCategories).catch(() => undefined)
  }
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

    const unsubscribe = subscribe(key, () => {
      const fresh = readCached<T>(key)
      if (!cancelled && fresh !== undefined) {
        setState({ key, data: fresh, loading: false, error: null })
      }
    })

    const cached = readCached<T>(key)
    if (cached !== undefined) {
      queueMicrotask(() => {
        if (!cancelled) setState({ key, data: cached, loading: false, error: null })
      })
      return () => {
        unsubscribe()
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
      unsubscribe()
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
