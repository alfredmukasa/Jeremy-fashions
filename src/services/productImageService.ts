import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'

const BUCKET = 'product-images'
const MAX_BYTES = 10 * 1024 * 1024

// A minimal real Supabase client used ONLY to PUT a file to a pre-signed Storage
// upload URL. The signed token (minted server-side with the service role)
// authorizes the write, so the browser never needs Supabase auth. Everything
// else in the app goes through the Cloudflare-backed shim in ../lib/supabase.
let storageClient: SupabaseClient | null = null
function getStorageClient(): SupabaseClient {
  if (storageClient) return storageClient
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Image storage is not configured.')
  storageClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return storageClient
}

async function adminToken(): Promise<string> {
  const session = await supabase?.auth.getSession()
  const token = session?.data.session?.access_token
  if (!token) throw new Error('Sign in again to upload images.')
  return token
}

type SignResponse = { path: string; token: string; publicUrl: string }

async function signUpload(
  token: string,
  folder: string,
  file: File,
): Promise<SignResponse> {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  const response = await fetch(`${base}/admin/uploads/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ folder, fileName: file.name, contentType: file.type }),
  })
  const result = (await response.json().catch(() => null)) as
    | (SignResponse & { error?: string })
    | null
  if (!response.ok || !result?.token)
    throw new Error((result && result.error) || 'Could not prepare the image upload.')
  return result
}

export async function uploadProductImageFiles(folder: string, files: File[]): Promise<string[]> {
  const urls: string[] = []
  const token = await adminToken()

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      throw new Error(`Unsupported file type: ${file.name}`)
    }
    if (file.size > MAX_BYTES) {
      throw new Error(`Image too large (max 10 MB): ${file.name}`)
    }

    const { path, token: uploadToken, publicUrl } = await signUpload(token, folder, file)
    const { error } = await getStorageClient()
      .storage.from(BUCKET)
      .uploadToSignedUrl(path, uploadToken, file, { contentType: file.type })
    if (error) throw new Error(error.message || 'Image upload failed.')

    if (!publicUrl) throw new Error('Could not resolve uploaded image URL.')
    urls.push(publicUrl)
  }

  return urls
}
