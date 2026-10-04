import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import type { StorePolicy } from '../../constants/siteContent'
import { adminGetSiteSettings, adminUpsertSiteSetting } from '../../services/adminService'
import { parseStorePolicy, storePolicyPayload, validateStorePolicy } from '../../services/siteContentService'
import { Button } from '../common/Button'
import { FieldLabel, Input } from '../common/Input'

type AdminStorePolicySectionProps = {
  settingKey: string
  fallback: StorePolicy
  heading: string
  description: string
}

export function AdminStorePolicySection({
  settingKey,
  fallback,
  heading,
  description,
}: AdminStorePolicySectionProps) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null)
  const settingsQuery = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminGetSiteSettings })

  const persisted = useMemo(() => {
    const parsed = parseStorePolicy(settingsQuery.data?.[settingKey], fallback)
    return {
      title: parsed.published ? parsed.title : fallback.title,
      body: parsed.published ? parsed.body : fallback.body,
      published: parsed.published,
    }
  }, [fallback, settingKey, settingsQuery.data])

  const form = draft ?? { title: persisted.title, body: persisted.body }

  const saveMutation = useMutation({
    mutationFn: () => adminUpsertSiteSetting(settingKey, storePolicyPayload(form)),
    onSuccess: () => {
      toast.success(`${heading} published`)
      setDraft(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      void queryClient.invalidateQueries({ queryKey: ['public', 'site-content'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  })

  const resetMutation = useMutation({
    mutationFn: () => adminUpsertSiteSetting(settingKey, storePolicyPayload(fallback)),
    onSuccess: () => {
      toast.success(`${heading} restored`)
      setDraft(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      void queryClient.invalidateQueries({ queryKey: ['public', 'site-content'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Restore failed'),
  })

  function publish() {
    const error = validateStorePolicy(form)
    if (error) {
      toast.error(error)
      return
    }
    saveMutation.mutate()
  }

  function restore() {
    if (!window.confirm(`Replace the published ${heading.toLowerCase()} with the built-in default?`)) return
    resetMutation.mutate()
  }

  return (
    <section className="space-y-4 border border-neutral-200 bg-white p-6">
      <div>
        <h2 className="font-serif text-xl text-neutral-900">{heading}</h2>
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-neutral-500">
          {settingsQuery.isLoading
            ? 'Loading current version…'
            : persisted.published
              ? 'Published'
              : 'Not published yet — customers still see the built-in copy'}
        </p>
      </div>

      {settingsQuery.isError ? (
        <p className="text-sm text-rose-700">
          {settingsQuery.error instanceof Error ? settingsQuery.error.message : 'Could not load this section.'}
        </p>
      ) : null}

      <div>
        <FieldLabel id={`${settingKey}-title`}>Title</FieldLabel>
        <Input
          id={`${settingKey}-title`}
          value={form.title}
          maxLength={140}
          disabled={settingsQuery.isLoading}
          onChange={(event) => setDraft({ title: event.target.value, body: form.body })}
        />
      </div>
      <div>
        <FieldLabel id={`${settingKey}-body`}>Policy text</FieldLabel>
        <textarea
          id={`${settingKey}-body`}
          rows={10}
          maxLength={12000}
          value={form.body}
          disabled={settingsQuery.isLoading}
          onChange={(event) => setDraft({ title: form.title, body: event.target.value })}
          className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-900 outline-none focus:border-neutral-900"
        />
        <p className="mt-1 text-xs text-neutral-500">{form.body.trim().length} / 12,000</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={publish} disabled={saveMutation.isPending || settingsQuery.isLoading}>
          {saveMutation.isPending ? 'Publishing…' : 'Save and publish'}
        </Button>
        <Button type="button" variant="outline" onClick={restore} disabled={resetMutation.isPending}>
          {resetMutation.isPending ? 'Restoring…' : 'Restore default'}
        </Button>
      </div>
    </section>
  )
}
