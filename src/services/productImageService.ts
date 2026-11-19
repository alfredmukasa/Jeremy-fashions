import { supabase } from '../lib/supabase'

const MAX_BYTES = 10 * 1024 * 1024

async function adminToken(): Promise<string> {
  const session = await supabase?.auth.getSession()
  const token = session?.data.session?.access_token
  if (!token) throw new Error('Sign in again to upload images.')
  return token
}

type SignResponse = { uploadUrl: string; publicUrl: string; key: string }

async function signUpload(token: string, folder: string, file: File): Promise<SignResponse> {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  const response = await fetch(`${base}/admin/uploads/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ folder, fileName: file.name, contentType: file.type }),
  })
  const result = (await response.json().catch(() => null)) as
    | (SignResponse & { error?: string })
    | null
  if (!response.ok || !result?.uploadUrl)
    throw new Error((result && result.error) || 'Could not prepare the image upload.')
  return result
}

// Uploads go straight to Cloudflare R2 via a short-lived presigned URL minted by
// the server. No Supabase, and the file never passes through the API function.
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

    const { uploadUrl, publicUrl } = await signUpload(token, folder, file)
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!put.ok) throw new Error(`Image upload failed (${put.status}).`)

    if (!publicUrl) throw new Error('Could not resolve uploaded image URL.')
    urls.push(publicUrl)
  }

  return urls
}
