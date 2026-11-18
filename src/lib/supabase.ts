import type { SupabaseClient } from '@supabase/supabase-js'

import { authStorage } from './authStorage'

/**
 * Store data and sign-in go through the Cloudflare API on this site.
 * The export name stays `supabase` so existing screens keep working.
 * `isSupabaseConfigured` means that API is the store backend.
 */
export const isSupabaseConfigured = true
const STORAGE_KEY = 'krewnox-auth'

type StoreUser = { id: string; email: string; app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> }
type StoreSession = { access_token: string; refresh_token: string; user: StoreUser }
type AuthListener = (event: string, session: StoreSession | null) => void
const listeners = new Set<AuthListener>()

function readStored(): StoreSession | null {
  const raw = authStorage.getItem(STORAGE_KEY) as string | null
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoreSession
    if (!parsed.access_token || !parsed.user?.id) return null
    const exp = tokenExpiry(parsed.access_token)
    if (exp && exp * 1000 < Date.now()) { authStorage.removeItem(STORAGE_KEY); return null }
    return parsed
  } catch { return null }
}
function writeStored(session: StoreSession | null) {
  if (!session) authStorage.removeItem(STORAGE_KEY)
  else authStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  for (const listener of listeners) listener(session ? 'SIGNED_IN' : 'SIGNED_OUT', session)
}
function decode(token: string): Record<string, unknown> | null {
  const body = token.split('.')[0]
  if (!body) return null
  try { return JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown> } catch { return null }
}
function tokenExpiry(token: string): number | null {
  const payload = decode(token)
  return payload && typeof payload.exp === 'number' ? payload.exp : null
}
function userFromToken(token: string): StoreUser | null {
  const payload = decode(token)
  if (!payload || typeof payload.id !== 'string' || typeof payload.email !== 'string') return null
  return {
    id: payload.id,
    email: payload.email,
    app_metadata: (payload.app_metadata as Record<string, unknown>) ?? {},
    user_metadata: (payload.user_metadata as Record<string, unknown>) ?? {},
  }
}
async function authRequest(path: string, body: Record<string, unknown>, token?: string) {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const result = (await response.json().catch(() => ({}))) as { error?: string; access_token?: string; refresh_token?: string; user?: StoreUser }
  if (!response.ok || !result.access_token || !result.user) {
    return { data: { session: null, user: null }, error: { message: result.error || 'Request failed.' } }
  }
  const session: StoreSession = { access_token: result.access_token, refresh_token: result.refresh_token || result.access_token, user: result.user }
  writeStored(session)
  return { data: { session, user: result.user }, error: null }
}
type Filter = { op: 'eq' | 'in' | 'neq' | 'not-in'; column: string; value: unknown }
class Query {
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private columns = '*'
  private filters: Filter[] = []
  private orders: Array<{ column: string; ascending?: boolean }> = []
  private rowLimit: number | null = null
  private rowOffset: number | null = null
  private values: Record<string, unknown> | Record<string, unknown>[] | null = null
  private onConflict: string | undefined
  private cardinality: 'many' | 'one' | 'maybe' = 'many'
  private head = false
  private readonly table: string
  constructor(table: string) { this.table = table }
  select(columns = '*', options?: { head?: boolean }): this { this.columns = columns; this.head = options?.head === true; return this }
  eq(column: string, value: unknown): this { this.filters.push({ op: 'eq', column, value }); return this }
  neq(column: string, value: unknown): this { this.filters.push({ op: 'neq', column, value }); return this }
  in(column: string, value: unknown[]): this { this.filters.push({ op: 'in', column, value }); return this }
  not(column: string, operator: string, value: string): this {
    if (operator !== 'in') return this
    const parsed = value.replace(/^\(/, '').replace(/\)$/, '').split(',').map((part) => part.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    this.filters.push({ op: 'not-in', column, value: parsed })
    return this
  }
  order(column: string, options?: { ascending?: boolean }): this { this.orders.push({ column, ascending: options?.ascending }); return this }
  limit(count: number): this { this.rowLimit = count; return this }
  range(from: number, to: number): this { this.rowOffset = from; this.rowLimit = to - from + 1; return this }
  abortSignal(_signal?: AbortSignal): this { return this }
  insert(values: Record<string, unknown> | Record<string, unknown>[]): this { this.action = 'insert'; this.values = values; return this }
  upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }): this { this.action = 'upsert'; this.values = values; this.onConflict = options?.onConflict; return this }
  update(values: Record<string, unknown>): this { this.action = 'update'; this.values = values; return this }
  delete(): this { this.action = 'delete'; return this }
  maybeSingle(): Promise<{ data: Record<string, any> | null; error: { message: string } | null }> {
    this.cardinality = 'maybe'
    return this.execute()
  }
  single(): Promise<{ data: Record<string, any> | null; error: { message: string } | null }> {
    this.cardinality = 'one'
    return this.execute()
  }
  then<TResult1, TResult2 = never>(
    onfulfilled?: ((value: { data: Array<Record<string, any>> | null; error: { message: string } | null; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }
  private async execute(): Promise<{ data: any; error: { message: string } | null; count?: number }> {
    const session = readStored()
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(session ? { authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ table: this.table, action: this.action, columns: this.columns, filters: this.filters, orders: this.orders, limit: this.rowLimit, offset: this.rowOffset, values: this.values, onConflict: this.onConflict, single: this.cardinality, head: this.head }),
    })
    const result = (await response.json().catch(() => null)) as { data: unknown; error: { message: string } | null; count?: number } | null
    return result ?? { data: null, error: { message: 'The store could not be reached.' } }
  }
}
export const supabase = {
  from(table: string) { return new Query(table) },
  storage: { from() { return { async upload() { return { data: null, error: { message: 'Product photos cannot be uploaded until Cloudflare R2 is enabled for this account.' } } }, getPublicUrl() { return { data: { publicUrl: '' } } } } } },
  rpc() { return Promise.resolve({ data: null, error: { message: 'That account action is not available while the store runs on Cloudflare.' } }) },
  channel() {
    const api = {
      on() { return api },
      subscribe(callback?: (status: string) => void) {
        callback?.('SUBSCRIBED')
        return api
      },
    }
    return api
  },
  removeChannel() { return Promise.resolve() },
  auth: {
    async getSession() { return { data: { session: readStored() }, error: null } },
    async getUser() { const session = readStored(); return { data: { user: session?.user ?? null }, error: session ? null : { message: 'Sign in to continue.' } } },
    onAuthStateChange(callback: AuthListener) {
      listeners.add(callback)
      callback('INITIAL_SESSION', readStored())
      return { data: { subscription: { unsubscribe() { listeners.delete(callback) } } } }
    },
    signInWithPassword(input: { email: string; password: string }) { return authRequest('login', input) },
    signUp(input: { email: string; password: string; options?: { data?: { full_name?: string } } }) { return authRequest('register', { email: input.email, password: input.password, fullName: input.options?.data?.full_name ?? '' }) },
    async signInWithOAuth() { return { data: { url: null }, error: { message: 'Google sign-in is paused while the store runs on Cloudflare. Use email and password.' } } },
    async signOut() { writeStored(null); return { error: null } },
    async setSession(input: { access_token: string; refresh_token: string }) {
      const user = userFromToken(input.access_token)
      if (!user) return { data: { session: null }, error: { message: 'Sign-in failed. Please try again.' } }
      const session = { access_token: input.access_token, refresh_token: input.refresh_token, user }
      writeStored(session)
      return { data: { session }, error: null }
    },
    async refreshSession() { const session = readStored(); return { data: { session }, error: session ? null : { message: 'Sign in again.' } } },
    async updateUser(input: { password?: string }) {
      const session = readStored()
      if (!session || !input.password) return { data: { user: null }, error: { message: 'Sign in again to update your password.' } }
      const response = await fetch('/api/auth/password', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ password: input.password }) })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) return { data: { user: null }, error: { message: result.error || 'Unable to update the password.' } }
      return { data: { user: session.user }, error: null }
    },
    async resetPasswordForEmail() { return { data: null, error: { message: 'Password reset email is paused while the store runs on Cloudflare. Sign in with your current password.' } } },
  },
} as unknown as SupabaseClient
