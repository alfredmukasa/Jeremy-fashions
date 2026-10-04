import { Router } from 'express'

import { supabaseAdmin, supabaseAnon } from '../lib/supabase.js'
import {
  deliverContactEmail,
  isValidContactEmail,
  resolveContactRecipient,
} from '../services/contactMail.js'

export const contactRouter = Router()

const CONTACT_RECIPIENT_KEY = 'contact_recipient'

function readField(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function readConfiguredRecipient(): Promise<string> {
  const client = supabaseAdmin ?? supabaseAnon
  const { data, error } = await client
    .from('site_settings')
    .select('value')
    .eq('key', CONTACT_RECIPIENT_KEY)
    .maybeSingle()

  if (error) {
    console.error('[contact] unable to read recipient', error.message)
    return resolveContactRecipient(null)
  }

  return resolveContactRecipient(data?.value)
}

contactRouter.post('/notify', async (req, res) => {
  const firstName = readField(req.body?.firstName, 80)
  const lastName = readField(req.body?.lastName, 80)
  const email = readField(req.body?.email, 254).toLowerCase()
  const message = readField(req.body?.message, 4000)

  if (!firstName || !lastName || !isValidContactEmail(email) || message.length < 10) {
    return res.status(400).json({ error: 'Invalid contact message.' })
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
    console.error('[contact] notify failed', error)
    return res.status(502).json({ error: 'The message was saved, but email delivery failed.' })
  }
})
