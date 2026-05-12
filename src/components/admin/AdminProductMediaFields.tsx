import { useRef, useState } from 'react'
import toast from 'react-hot-toast'

import type { AdminProductPayload } from '../../services/adminService'
import { uploadProductImageFiles } from '../../services/productImageService'
import { Button } from '../common/Button'
import { FieldLabel, Input } from '../common/Input'

type AdminProductMediaFieldsProps = {
  form: AdminProductPayload
  uploadFolder: string
  onChange: (next: AdminProductPayload) => void
}

function normalizeGallery(images: string[]): string[] {
  return images.map((url) => url.trim()).filter(Boolean)
}

export function AdminProductMediaFields({ form, uploadFolder, onChange }: AdminProductMediaFieldsProps) {
  const featuredInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  function setGallery(next: string[]) {
    onChange({ ...form, gallery_images: normalizeGallery(next) })
  }

  async function uploadFeatured(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const [url] = await uploadProductImageFiles(uploadFolder, [files[0]])
      onChange({ ...form, image_url: url })
      toast.success('Featured image uploaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (featuredInputRef.current) featuredInputRef.current.value = ''
    }
  }

  async function uploadGallery(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls = await uploadProductImageFiles(uploadFolder, Array.from(files))
      setGallery([...form.gallery_images, ...urls])
      toast.success(urls.length === 1 ? 'Gallery image uploaded' : `${urls.length} gallery images uploaded`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  const galleryFields = form.gallery_images.length ? form.gallery_images : ['']

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <FieldLabel id="pimg">Featured image</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="px-4 py-2" disabled={uploading} onClick={() => featuredInputRef.current?.click()}>
            Browse image
          </Button>
          <input
            ref={featuredInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void uploadFeatured(e.target.files)}
          />
        </div>
        <Input
          id="pimg"
          value={form.image_url}
          onChange={(e) => onChange({ ...form, image_url: e.target.value })}
          placeholder="https://… or upload from your device"
          required
        />
        {form.image_url.trim() ? (
          <div className="overflow-hidden border border-neutral-200 bg-neutral-100">
            <img src={form.image_url.trim()} alt="" className="aspect-[3/4] w-full max-w-xs object-cover" />
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FieldLabel id="pgal-0">Additional images</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="px-4 py-2" disabled={uploading} onClick={() => galleryInputRef.current?.click()}>
              Browse images
            </Button>
            <Button type="button" variant="outline" className="px-4 py-2" onClick={() => setGallery([...form.gallery_images, ''])}>
              Add URL
            </Button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void uploadGallery(e.target.files)}
            />
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Upload multiple files or paste URLs. The storefront uses the featured image first, then gallery images for hover
          and product detail.
        </p>
        <div className="space-y-3">
          {galleryFields.map((url, index) => (
            <div key={`gallery-${index}`} className="grid gap-3 border border-neutral-200 p-3 sm:grid-cols-[1fr_auto]">
              <div>
                <FieldLabel id={`pgal-${index}`}>Image {index + 1}</FieldLabel>
                <Input
                  id={`pgal-${index}`}
                  value={url}
                  onChange={(e) => {
                    const next = [...form.gallery_images]
                    if (!form.gallery_images.length) next[0] = e.target.value
                    else next[index] = e.target.value
                    setGallery(next)
                  }}
                  placeholder="https://…"
                />
              </div>
              <div className="flex items-end gap-2">
                {url.trim() ? (
                  <div className="h-16 w-16 overflow-hidden border border-neutral-200 bg-neutral-100">
                    <img src={url.trim()} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-2 text-red-600"
                  onClick={() => {
                    const next = form.gallery_images.filter((_, i) => i !== index)
                    setGallery(next)
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
