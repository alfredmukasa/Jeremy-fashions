import { Router } from 'express'
import type { Request } from 'express'
import { randomUUID } from 'node:crypto'

import { readSession } from '../lib/session.js'
import { requireSupabaseAdmin } from '../lib/supabase.js'

export const uploadsRouter = Router()

const BUCKET = 'product-images'
// Folder segments are product ids/slugs or `site-hero/<uuid>`. No dots (blocks
// path traversal), no leading slash.
const ALLOWED_FOLDER = /^[a-z0-9][a-z0-9/_-]{0,120}$/i

function adminUser(req: Request) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const user = readSession(header.slice('Bearer '.length).trim())
  if (!user || user.app_metadata?.role !== 'admin') return null
  return user
}

function sanitizeFileName(name: string): string {
  const safe = (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return safe || 'image.jpg'
}

// Mint a Supabase Storage signed upload URL. The browser then uploads the file
// directly to Storage with the returned token, so large images never pass
// through this serverless function (Vercel caps request bodies well below the
// 10 MB image limit), and the service-role signature bypasses the legacy
// Supabase-auth RLS that the Cloudflare session can no longer satisfy.
uploadsRouter.post('/sign', async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  if (!adminUser(req))
    return res.status(403).json({ error: 'Admin sign-in is required to upload images.' })

  const { folder, fileName, contentType } = (req.body ?? {}) as {
    folder?: string
    fileName?: string
    contentType?: string
  }
  if (!folder || !ALLOWED_FOLDER.test(folder))
    return res.status(400).json({ error: 'Invalid upload folder.' })
  if (!contentType || !contentType.startsWith('image/'))
    return res.status(400).json({ error: 'Only image uploads are allowed.' })

  let supabaseAdmin
  try {
    supabaseAdmin = requireSupabaseAdmin()
  } catch {
    return res.status(503).json({ error: 'Image storage is not configured.' })
  }

  const path = `${folder.replace(/\/+$/, '')}/${Date.now()}-${randomUUID()}-${sanitizeFileName(fileName ?? '')}`
  const signed = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (signed.error || !signed.data?.token)
    return res.status(502).json({ error: 'Could not prepare the image upload. Try again.' })

  const publicUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  if (!publicUrl)
    return res.status(502).json({ error: 'Could not resolve the uploaded image URL.' })

  return res.json({ path, token: signed.data.token, publicUrl })
})
