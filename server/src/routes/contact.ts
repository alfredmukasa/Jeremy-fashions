import { Router, type Request, type Response } from 'express'

import { supabaseAdmin, supabaseAnon } from '../lib/supabase.js'
import {
  deliverContactEmail,
  isValidContactEmail,
  resolveConfiguredSupportEmail,
} from '../services/contactMail.js'

export const contactRouter = Router()

const CONTACT_RECIPIENT_KEY = 'contact_recipient'
const STOREFRONT_KEY = 'storefront'

function readField(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function readConfiguredRecipient(): Promise<string> {
  const client = supabaseAdmin ?? supabaseAnon
  const { data, error } = await client
    .from('site_settings')
    .select('key, value')
    .in('key', [CONTACT_RECIPIENT_KEY, STOREFRONT_KEY])

  if (error) {
    console.error('[contact] unable to read recipient', error.message)
    return resolveConfiguredSupportEmail(null)
  }

  const contact = data?.find((row) => row.key === CONTACT_RECIPIENT_KEY)?.value
  const storefront = data?.find((row) => row.key === STOREFRONT_KEY)?.value
  return resolveConfiguredSupportEmail(contact, storefront)
}

async function persistContactMessage(input: {
  firstName: string
  lastName: string
  email: string
  message: string
}) {
  const client = supabaseAdmin ?? supabaseAnon
  const { error } = await client.from('contact_messages').insert({
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    message: input.message,
    status: 'new',
  })
  if (error) {
    console.error('[contact] persist failed', error.message)
    throw new Error('CONTACT_SAVE_FAILED')
  }
}

async function submitContact(req: Request, res: Response) {
  if (readField(req.body?.website, 80)) {
    return res.json({ ok: true, emailed: true })
  }

  const firstName = readField(req.body?.firstName, 80)
  const lastName = readField(req.body?.lastName, 80)
  const email = readField(req.body?.email, 254).toLowerCase()
  const message = readField(req.body?.message, 4000)

  if (!firstName || !lastName || !isValidContactEmail(email) || message.length < 10) {
    return res.status(400).json({ error: 'Invalid contact message.' })
  }

  try {
    await persistContactMessage({ firstName, lastName, email, message })
  } catch {
    return res.status(502).json({ error: 'We could not save your message. Please try again shortly.' })
  }

  try {
    const to = await readConfiguredRecipient()
    const delivery = await deliverContactEmail(
      { firstName, lastName, email, message, to },
      {
        resendApiKey: process.env.RESEND_API_KEY?.trim(),
        resendFrom: process.env.RESEND_FROM_EMAIL?.trim(),
      },
    )
    return res.json({ ok: true, emailed: delivery.delivered })
  } catch (error) {
    console.error('[contact] email failed', error)
    return res.json({ ok: true, emailed: false })
  }
}

contactRouter.post('/submit', submitContact)
contactRouter.post('/notify', submitContact)
