import axios from 'axios'

/**
 * Placeholder API client for future backend integration (catalog, cart sync, auth).
 * Do not call real endpoints in the MVP.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15_000,
})

export async function healthCheckPlaceholder(): Promise<{ ok: true }> {
  return Promise.resolve({ ok: true })
}
