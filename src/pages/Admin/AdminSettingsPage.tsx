import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import { adminGetSiteSettings, adminUpsertSiteSetting, adminGetWaitlistMode, adminSetWaitlistMode } from '../../services/adminService'
import { cn } from '../../utils/cn'

type StorefrontSettings = {
  brandName: string
  supportEmail: string
  lowStockThreshold: number
}

const SETTINGS_KEY = 'storefront'

const defaults: StorefrontSettings = {
  brandName: 'Jeremy Atelier',
  supportEmail: 'support@jeremyatelier.com',
  lowStockThreshold: 5,
}

export default function AdminSettingsPage() {
  return (
    <RequireAdminPermission permission="settings.manage">
      <AdminSettingsContent />
    </RequireAdminPermission>
  )
}

function AdminSettingsContent() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<StorefrontSettings | null>(null)

  const settingsQuery = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminGetSiteSettings })
  const waitlistModeQuery = useQuery({ queryKey: ['admin', 'waitlistMode'], queryFn: adminGetWaitlistMode })

  const toggleWaitlistMutation = useMutation({
    mutationFn: (next: boolean) => adminSetWaitlistMode(next),
    onSuccess: (_data, next) => {
      toast.success(next ? 'Waitlist mode enabled' : 'Waitlist mode disabled')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'waitlistMode'] })
      void queryClient.invalidateQueries({ queryKey: ['public', 'waitlistMode'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  })

  const persisted = useMemo<StorefrontSettings>(() => {
    const raw = settingsQuery.data?.[SETTINGS_KEY]
    if (!raw || typeof raw !== 'object') return defaults
    const value = raw as Partial<StorefrontSettings>
    return {
      brandName: typeof value.brandName === 'string' ? value.brandName : defaults.brandName,
      supportEmail: typeof value.supportEmail === 'string' ? value.supportEmail : defaults.supportEmail,
      lowStockThreshold:
        typeof value.lowStockThreshold === 'number' ? value.lowStockThreshold : defaults.lowStockThreshold,
    }
  }, [settingsQuery.data])

  const form = draft ?? persisted

  const saveMutation = useMutation({
    mutationFn: () => adminUpsertSiteSetting(SETTINGS_KEY, form),
    onSuccess: () => {
      toast.success('Settings saved')
      setDraft(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  })

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Configuration" title="Website settings" description="Storefront defaults and operational thresholds." />

      <div className="flex max-w-2xl flex-col gap-4 border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-500">Storefront mode</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">Waitlist mode</p>
            <p className="mt-1 max-w-md text-xs text-neutral-600">
              When ON, shoppers only see the waitlist experience. The admin dashboard stays fully available.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(waitlistModeQuery.data)}
            disabled={waitlistModeQuery.isLoading || toggleWaitlistMutation.isPending}
            onClick={() => toggleWaitlistMutation.mutate(!waitlistModeQuery.data)}
            className={cn(
              'relative inline-flex h-9 w-[3.25rem] shrink-0 items-center rounded-full border border-neutral-300 bg-neutral-100 transition',
              waitlistModeQuery.data && 'border-neutral-900 bg-neutral-900',
              (waitlistModeQuery.isLoading || toggleWaitlistMutation.isPending) && 'opacity-60',
            )}
          >
            <span
              className={cn(
                'inline-block h-7 w-7 translate-x-1 rounded-full bg-white shadow transition',
                waitlistModeQuery.data && 'translate-x-[1.35rem]',
              )}
            />
            <span className="sr-only">Toggle waitlist mode</span>
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          <span>{waitlistModeQuery.data ? 'On' : 'Off'}</span>
          {waitlistModeQuery.isLoading ? <span className="text-neutral-400">Syncing…</span> : null}
        </div>
      </div>

      <form
        className="grid max-w-2xl gap-4 border border-neutral-200 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
      >
        <div>
          <FieldLabel id="brandName">Brand name</FieldLabel>
          <Input
            id="brandName"
            value={form.brandName}
            onChange={(e) => setDraft((current) => ({ ...(current ?? persisted), brandName: e.target.value }))}
          />
        </div>
        <div>
          <FieldLabel id="supportEmail">Support email</FieldLabel>
          <Input
            id="supportEmail"
            type="email"
            value={form.supportEmail}
            onChange={(e) => setDraft((current) => ({ ...(current ?? persisted), supportEmail: e.target.value }))}
          />
        </div>
        <div>
          <FieldLabel id="lowStockThreshold">Low stock threshold</FieldLabel>
          <Input
            id="lowStockThreshold"
            type="number"
            min={0}
            value={form.lowStockThreshold}
            onChange={(e) =>
              setDraft((current) => ({ ...(current ?? persisted), lowStockThreshold: Number(e.target.value) }))
            }
          />
        </div>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </form>
    </div>
  )
}
