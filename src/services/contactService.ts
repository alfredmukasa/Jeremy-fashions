import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ContactMessageInput } from '../types'

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'unknown'; message: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function trimField(value: string, max: number): string {
  return value.trim().slice(0, max)
}

/**
 * Persists a public Contact Us submission. Guests and signed-in customers can
 * both send; signed-in users are attached when a session exists.
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

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      reason: 'unknown',
      message: 'Messaging is temporarily unavailable. Please try again shortly.',
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const payload = {
    first_name: firstName,
    last_name: lastName,
    email,
    message,
    status: 'new' as const,
    user_id: session?.user?.id ?? null,
  }

  const { error } = await supabase.from('contact_messages').insert(payload)

  if (error) {
    console.error('[contactService.submitContactMessage]', error)
    return {
      ok: false,
      reason: 'unknown',
      message: 'We could not send your message. Please try again shortly.',
    }
  }

  return { ok: true }
}
