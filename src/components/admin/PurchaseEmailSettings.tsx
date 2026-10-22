import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { isValidContactEmail } from '../../lib/contactRecipient'
import { adminUpsertSiteSetting } from '../../services/adminService'
import {
  purchaseNotificationRequest,
  type PurchaseConnectionStatus,
} from '../../services/purchaseNotificationService'
import { Button } from '../common/Button'
import { FieldLabel, Input } from '../common/Input'

export function PurchaseEmailSettings({
  stored,
  supportEmail,
  isLoading,
  loadFailed,
}: {
  stored: unknown
  supportEmail: string
  isLoading: boolean
  loadFailed: boolean
}) {
  const raw =
    stored && typeof stored === 'object'
      ? (stored as Record<string, unknown>)
      : {}
  const persisted = {
    enabled: raw.enabled !== false,
    email: typeof raw.email === 'string' ? raw.email : '',
  }
  const [draft, setDraft] = useState<typeof persisted | null>(null)
  const form = draft ?? persisted
  const queryClient = useQueryClient()
  const connection = useQuery({
    queryKey: ['admin', 'purchase-connections'],
    queryFn: () =>
      purchaseNotificationRequest<PurchaseConnectionStatus>('status'),
  })
  const save = useMutation({
    mutationFn: async () => {
      const email = form.email.trim().toLowerCase()
      if (email && !isValidContactEmail(email))
        throw new Error('Enter a valid purchase alert email address.')
      await adminUpsertSiteSetting('purchase_notifications', {
        enabled: form.enabled,
        email,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      setDraft(null)
      toast.success('Purchase email settings saved.')
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Settings could not be saved.',
      ),
  })
  const sendTest = useMutation({
    mutationFn: () =>
      purchaseNotificationRequest<{ accepted: boolean; to: string }>(
        'test',
        'POST',
      ),
    onSuccess: (result) =>
      toast.success(`Test email accepted for ${result.to}. Check that inbox.`),
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Test email failed.',
      ),
  })
  return (
    <form
      className="grid max-w-2xl gap-4 border border-neutral-200 bg-white p-6"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate()
      }}
    >
      <div>
        <h2 className="text-sm font-medium">New purchase alerts</h2>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">
          Receive an email as soon as payment is confirmed, including the order
          number, items and total. The bell keeps a separate unread count for
          each admin.
        </p>
      </div>
      {connection.data ? (
        <div
          className="space-y-1 text-xs text-neutral-600"
          aria-label="Purchase alert connections"
        >
          <p>
            Purchase database:{' '}
            {connection.data.databaseConnected ? 'connected' : 'unavailable'}
          </p>
          <p>
            Email service:{' '}
            {connection.data.emailConfigured
              ? 'configured — send a test to verify'
              : 'not configured'}
          </p>
        </div>
      ) : connection.isError ? (
        <p className="text-xs text-amber-800">
          Connection checks are unavailable. Refresh to retry.
        </p>
      ) : (
        <p className="text-xs text-neutral-500">Checking connections…</p>
      )}
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.enabled}
          disabled={isLoading || loadFailed || save.isPending}
          onChange={(event) =>
            setDraft({ ...form, enabled: event.target.checked })
          }
        />
        Email new purchases to the admin
      </label>
      <div>
        <FieldLabel id="purchaseEmail">Purchase alert email</FieldLabel>
        <Input
          id="purchaseEmail"
          type="email"
          maxLength={254}
          value={form.email}
          placeholder={supportEmail}
          disabled={isLoading || loadFailed || save.isPending}
          onChange={(event) => setDraft({ ...form, email: event.target.value })}
        />
        <p className="mt-2 text-xs text-neutral-500">
          Leave blank to use the saved support email: {supportEmail}. This does
          not change customer receipts or support messages.
        </p>
      </div>
      {loadFailed ? (
        <p role="alert" className="text-sm text-rose-700">
          Purchase email settings could not be loaded. Refresh before saving.
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={isLoading || loadFailed || save.isPending}
      >
        {save.isPending ? 'Saving…' : 'Save purchase alerts'}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={
          isLoading ||
          loadFailed ||
          save.isPending ||
          sendTest.isPending ||
          draft !== null
        }
        onClick={() => sendTest.mutate()}
      >
        {sendTest.isPending ? 'Sending test…' : 'Send test email'}
      </Button>
      <p className="text-xs text-neutral-500">
        Save any changes before testing. The test uses your saved recipient and
        creates no order or charge.
      </p>
    </form>
  )
}
