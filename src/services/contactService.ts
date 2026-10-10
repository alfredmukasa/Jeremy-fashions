import type { ContactMessageInput } from '../types'

export type ContactResult =
  | { ok: true; emailed: boolean }
  | { ok: false; reason: 'invalid' | 'unknown'; message: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const API_BASE = (import.meta.env.VITE_PAYMENTS_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

function trimField(value: string, max: number): string {
  return value.trim().slice(0, max)
}

/**
 * Sends a public Contact Us submission through the payment API so the message
 * is stored and emailed in one rate-limited request.
 */
export async function submitContactMessage(entry: ContactMessageInput): Promise<ContactResult> {
  const firstName = trimField(entry.firstName, 80)
  const lastName = trimField(entry.lastName, 80)
  const email = trimField(entry.email, 254).toLowerCase()
  const message = trimField(entry.message, 4000)

  if (!firstName || !lastName) {
    return { ok: false, reason: 'invalid', message: 'Please enter your first and last name.' }
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, reason: 'invalid', message: 'Enter a valid email address.' }
  }
  if (message.length < 10) {
    return { ok: false, reason: 'invalid', message: 'Please share a little more in your message.' }
  }

  try {
    const response = await fetch(`${API_BASE}/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, message }),
    })
    const body = (await response.json().catch(() => ({}))) as { emailed?: boolean; error?: string }
    if (!response.ok) {
      return {
        ok: false,
        reason: 'unknown',
        message: 'We could not send your message. Please try again shortly.',
      }
    }
    return { ok: true, emailed: body.emailed === true }
  } catch (error) {
    console.error('[contactService.submitContactMessage]', error)
    return {
      ok: false,
      reason: 'unknown',
      message: 'We could not send your message. Please try again shortly.',
    }
  }
}
