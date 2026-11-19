import { Router } from 'express'
import type { Request } from 'express'
import { randomUUID } from 'node:crypto'
import { AwsClient } from 'aws4fetch'

import { config } from '../config.js'
import { readSession } from '../lib/session.js'

export const uploadsRouter = Router()

// Folder segments are product ids/slugs or `site-hero/<uuid>`. No dots (blocks
// path traversal), no leading slash.
const ALLOWED_FOLDER = /^[a-z0-9][a-z0-9/_-]{0,120}$/i
const SIGN_EXPIRY_SECONDS = 300

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

function r2Endpoint(): string | null {
  if (config.r2Endpoint) return config.r2Endpoint.replace(/\/$/, '')
  if (config.r2AccountId) return `https://${config.r2AccountId}.r2.cloudflarestorage.com`
  return null
}

function r2Ready(): boolean {
  return Boolean(config.r2AccessKeyId && config.r2SecretAccessKey && config.r2Bucket && config.r2PublicBaseUrl && r2Endpoint())
}

// Mint a presigned R2 (S3) PUT URL. The browser uploads the file straight to R2
// with it, so large images never pass through this serverless function and no
// R2 credentials ever reach the client.
uploadsRouter.post('/sign', async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  if (!adminUser(req))
    return res.status(403).json({ error: 'Admin sign-in is required to upload images.' })
  if (!r2Ready())
    return res.status(503).json({ error: 'Image storage is not configured yet.' })

  const { folder, fileName, contentType } = (req.body ?? {}) as {
    folder?: string
    fileName?: string
    contentType?: string
  }
  if (!folder || !ALLOWED_FOLDER.test(folder))
    return res.status(400).json({ error: 'Invalid upload folder.' })
  if (!contentType || !contentType.startsWith('image/'))
    return res.status(400).json({ error: 'Only image uploads are allowed.' })

  const key = `${folder.replace(/\/+$/, '')}/${Date.now()}-${randomUUID()}-${sanitizeFileName(fileName ?? '')}`
  const endpoint = r2Endpoint() as string
  const objectUrl = `${endpoint}/${config.r2Bucket}/${key}`

  try {
    const client = new AwsClient({
      accessKeyId: config.r2AccessKeyId as string,
      secretAccessKey: config.r2SecretAccessKey as string,
      service: 's3',
      region: 'auto',
    })
    // signQuery moves auth into the URL; content-type is left unsigned so the
    // browser sets it on PUT (R2 stores it as the object's content type).
    const signed = await client.sign(
      `${objectUrl}?X-Amz-Expires=${SIGN_EXPIRY_SECONDS}`,
      { method: 'PUT', aws: { signQuery: true } },
    )
    const publicUrl = `${(config.r2PublicBaseUrl as string).replace(/\/$/, '')}/${key}`
    return res.json({ uploadUrl: signed.url, publicUrl, key })
  } catch (error) {
    console.error('[uploads] R2 presign failed', error instanceof Error ? error.message : error)
    return res.status(502).json({ error: 'Could not prepare the image upload. Try again.' })
  }
})
