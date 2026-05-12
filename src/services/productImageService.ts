import { supabase, isSupabaseConfigured } from '../lib/supabase'

const BUCKET = 'product-images'
const MAX_BYTES = 10 * 1024 * 1024

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function uploadProductImageFiles(folder: string, files: File[]): Promise<string[]> {
  const client = requireClient()
  const urls: string[] = []

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      throw new Error(`Unsupported file type: ${file.name}`)
    }
    if (file.size > MAX_BYTES) {
      throw new Error(`Image too large (max 10 MB): ${file.name}`)
    }

    const safeName = sanitizeFileName(file.name) || 'image.jpg'
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

    if (error) throw new Error(error.message)

    const { data } = client.storage.from(BUCKET).getPublicUrl(path)
    if (!data.publicUrl) throw new Error('Could not resolve uploaded image URL.')
    urls.push(data.publicUrl)
  }

  return urls
}
