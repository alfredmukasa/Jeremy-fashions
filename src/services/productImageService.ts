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

/**
 * Reduce Supabase Storage transfer size for newly uploaded product photography.
 * Preserve formats that may be animated or vector, and keep the original if
 * the browser cannot encode WebP or the optimized output is not smaller.
 * Existing public URLs are untouched.
 */
async function optimizeProductImage(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file
  if (typeof createImageBitmap !== 'function') return file

  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    const longest = Math.max(bitmap.width, bitmap.height)
    if (!longest) return file
    const scale = Math.min(1, 1600 / longest)
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.78),
    )
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file
    const baseName = file.name.replace(/\.[^.]+$/, '')
    return new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: file.lastModified,
    })
  } catch {
    // An optimization failure should not prevent the merchant uploading an image.
    return file
  } finally {
    bitmap?.close()
  }
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

    const optimized = await optimizeProductImage(file)
    const safeName = sanitizeFileName(optimized.name) || 'image.jpg'
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
    const { error } = await client.storage.from(BUCKET).upload(path, optimized, {
      // Paths are UUID-versioned, so long-lived browser caching is safe.
      cacheControl: '2592000',
      upsert: false,
      contentType: optimized.type,
    })

    if (error) throw new Error(error.message)

    const { data } = client.storage.from(BUCKET).getPublicUrl(path)
    if (!data.publicUrl) throw new Error('Could not resolve uploaded image URL.')
    urls.push(data.publicUrl)
  }

  return urls
}
