import { config } from '../config.js'

type D1QueryResponse = {
  success?: boolean
  errors?: { message?: string }[]
  result?: { results?: unknown[] }[]
}

// D1's HTTP query API rejects a statement with more than 100 bound parameters
// ("too many SQL variables"). Keep IN(...) chunks safely under that ceiling.
export const D1_MAX_VARIABLES = 90

// Fail a hung D1 call well before the Vercel function's 30s ceiling so a slow
// upstream surfaces an error fast instead of a 30-second request.
const D1_TIMEOUT_MS = 12_000

export function isD1Configured(): boolean {
  return Boolean(config.cloudflareAccountId && config.cloudflareApiToken && config.cloudflareD1DatabaseId)
}

export async function queryD1<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!isD1Configured()) {
    throw new Error('Cloudflare D1 is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), D1_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/d1/database/${config.cloudflareD1DatabaseId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
        signal: controller.signal,
      },
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[d1] query timed out after', D1_TIMEOUT_MS, 'ms')
      throw new Error('Cloudflare D1 query timed out')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }

  const body = (await response.json()) as D1QueryResponse
  if (!response.ok || !body.success) {
    const message = body.errors?.map((error) => error.message).filter(Boolean).join('; ')
    console.error('[d1] query failed', response.status, message || 'unknown error')
    throw new Error('Cloudflare D1 query failed')
  }

  return (body.result?.[0]?.results ?? []) as T[]
}

// Run `${sqlBefore} IN (<placeholders>) ${sqlAfter}` across `ids` in safe
// batches so the bound-parameter count never exceeds D1's limit, then merge
// the rows. `extraParams` are bound before the IN list on every chunk, for
// queries that carry other bindings.
export async function queryD1In<T>(
  sqlBefore: string,
  ids: readonly unknown[],
  sqlAfter = '',
  extraParams: readonly unknown[] = [],
): Promise<T[]> {
  if (ids.length === 0) return []
  const chunkSize = Math.max(1, D1_MAX_VARIABLES - extraParams.length)
  const results: T[] = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const placeholders = chunk.map(() => '?').join(', ')
    const sql = `${sqlBefore} IN (${placeholders})${sqlAfter ? ` ${sqlAfter}` : ''}`
    const rows = await queryD1<T>(sql, [...extraParams, ...chunk])
    results.push(...rows)
  }
  return results
}
