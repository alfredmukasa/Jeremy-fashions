import { useMemo } from 'react'

import { useProducts } from './useCatalog'
import { useDebouncedValue } from './useDebouncedValue'
import { filterProductsBySearch } from '../utils/productSearch'

type Options = {
  limit?: number
  debounceMs?: number
}

export function useProductSearch(query: string, options?: Options) {
  const debounceMs = options?.debounceMs ?? 250
  const debouncedQuery = useDebouncedValue(query, debounceMs)
  const trimmed = debouncedQuery.trim()
  const { data: products, loading, error } = useProducts()

  const results = useMemo(() => {
    if (!trimmed) return []
    return filterProductsBySearch(products ?? [], trimmed, options?.limit)
  }, [options?.limit, products, trimmed])

  const isSearching = Boolean(trimmed) && loading && !products

  return {
    results,
    loading: isSearching,
    error,
    query: trimmed,
    hasQuery: trimmed.length > 0,
    ready: !loading || Boolean(products),
  }
}
