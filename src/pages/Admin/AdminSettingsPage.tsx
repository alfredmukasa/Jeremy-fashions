import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import { adminGetSiteSettings, adminUpsertSiteSetting } from '../../services/adminService'

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
