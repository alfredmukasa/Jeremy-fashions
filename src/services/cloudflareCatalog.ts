import type { CategoryRow, ProductRow } from './mappers'

export type CloudflareCatalog = {
  products: ProductRow[]
  categories: CategoryRow[]
  siteSettings: { key: string; value: unknown; updated_at?: string | null }[]
  waitlistMode: boolean
}

let cached: CloudflareCatalog | null = null
let inflight: Promise<CloudflareCatalog | null> | null = null

export function loadCloudflareCatalog(): Promise<CloudflareCatalog | null> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = fetch('/api/catalog', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) return null
        const body = (await response.json()) as CloudflareCatalog
        if (!Array.isArray(body.products) || !Array.isArray(body.categories)) return null
        cached = body
        return body
      })
      .catch((error: unknown) => {
        console.error('[cloudflareCatalog]', error)
        return null
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}
