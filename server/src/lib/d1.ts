import { config } from '../config.js'

type D1QueryResponse = {
  success?: boolean
  errors?: { message?: string }[]
  result?: { results?: unknown[] }[]
}

export function isD1Configured(): boolean {
  return Boolean(config.cloudflareAccountId && config.cloudflareApiToken && config.cloudflareD1DatabaseId)
}

export async function queryD1<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!isD1Configured()) {
    throw new Error('Cloudflare D1 is not configured')
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/d1/database/${config.cloudflareD1DatabaseId}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.cloudflareApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    },
  )

  const body = (await response.json()) as D1QueryResponse
  if (!response.ok || !body.success) {
    const message = body.errors?.map((error) => error.message).filter(Boolean).join('; ')
    console.error('[d1] query failed', response.status, message || 'unknown error')
    throw new Error('Cloudflare D1 query failed')
  }

  return (body.result?.[0]?.results ?? []) as T[]
}
