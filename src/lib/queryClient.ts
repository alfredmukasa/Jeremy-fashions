import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Persist the query cache to localStorage so a reload (or a first paint on a slow
// connection) can show the last-known result instantly instead of a blank loading
// state, then silently revalidate. Scoped to `['public', ...]`-keyed queries only
// (site content, banners, waitlist-mode) — account, order, admin, and checkout
// queries are never written to storage, so no personal data is persisted on-device.
if (typeof window !== 'undefined') {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'krewnox-query-cache-v1',
  })

  void persistQueryClient({
    queryClient,
    persister,
    maxAge: 24 * 60 * 60 * 1000,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.queryKey[0] === 'public',
    },
  })
}
