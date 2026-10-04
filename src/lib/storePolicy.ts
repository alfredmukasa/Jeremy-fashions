import type { StorePolicy } from '../constants/siteContent'

export function parseStorePolicy(raw: unknown, fallback: StorePolicy, updatedAt?: string): StorePolicy {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...fallback, published: false }
  }
  const title = (raw as { title?: unknown }).title
  const body = (raw as { body?: unknown }).body
  const text = typeof body === 'string' ? body.trim() : ''
  if (!text) return { ...fallback, published: false }
  return {
    title: typeof title === 'string' && title.trim() ? title.trim() : fallback.title,
    body: text,
    published: true,
    updatedAt,
  }
}

export function storePolicyPayload(policy: { title: string; body: string }): Record<string, unknown> {
  return {
    title: policy.title.trim(),
    body: policy.body.trim(),
  }
}

export function formatPolicyUpdated(updatedAt?: string): string {
  if (!updatedAt) return 'Current'
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return 'Current'
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function validateStorePolicy(policy: { title: string; body: string }): string | null {
  const title = policy.title.trim()
  const body = policy.body.trim()
  if (!title) return 'A title is required.'
  if (title.length > 140) return 'Keep the title under 140 characters.'
  if (!body) return 'Add the policy text before publishing.'
  if (body.length > 12000) return 'Keep the policy under 12,000 characters.'
  return null
}
