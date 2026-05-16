import type { SupportedStorage } from '@supabase/supabase-js'

/**
 * Storage adapter that survives Safari private mode and ITP quirks:
 * tries localStorage, then sessionStorage, then in-memory fallback.
 */
function createAuthStorage(): SupportedStorage {
  const memory = new Map<string, string>()

  function read(store: Storage | null, key: string): string | null {
    if (!store) return null
    try {
      return store.getItem(key)
    } catch {
      return null
    }
  }

  function write(store: Storage | null, key: string, value: string): boolean {
    if (!store) return false
    try {
      store.setItem(key, value)
      return true
    } catch {
      return false
    }
  }

  function remove(store: Storage | null, key: string): void {
    if (!store) return
    try {
      store.removeItem(key)
    } catch {
      /* ignore */
    }
  }

  const local = typeof window !== 'undefined' ? window.localStorage : null
  const session = typeof window !== 'undefined' ? window.sessionStorage : null

  return {
    getItem(key: string) {
      return read(local, key) ?? read(session, key) ?? memory.get(key) ?? null
    },
    setItem(key: string, value: string) {
      if (write(local, key, value)) return
      if (write(session, key, value)) return
      memory.set(key, value)
    },
    removeItem(key: string) {
      remove(local, key)
      remove(session, key)
      memory.delete(key)
    },
  }
}

export const authStorage = createAuthStorage()
