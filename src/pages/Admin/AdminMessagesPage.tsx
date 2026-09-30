import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import {
  adminDeleteContactMessage,
  adminListContactMessages,
  adminUpdateContactMessageStatus,
  type AdminContactMessageRow,
  type AdminContactMessageStatus,
} from '../../services/adminService'

const STATUSES: AdminContactMessageStatus[] = ['new', 'read', 'replied', 'archived']

function statusLabel(status: AdminContactMessageStatus): string {
  if (status === 'new') return 'New'
  if (status === 'read') return 'Read'
  if (status === 'replied') return 'Replied'
  return 'Archived'
}

export default function AdminMessagesPage() {
  return (
    <RequireAdminPermission permission="messages.manage">
      <AdminMessagesContent />
    </RequireAdminPermission>
  )
}

function AdminMessagesContent() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const messagesQuery = useQuery({ queryKey: ['admin', 'contact-messages'], queryFn: adminListContactMessages })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminContactMessageStatus }) =>
      adminUpdateContactMessageStatus(id, status),
    onSuccess: () => {
      toast.success('Message updated')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteContactMessage,
    onSuccess: () => {
      toast.success('Message removed')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  })

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (messagesQuery.data ?? []).filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter
      const fullName = `${row.first_name} ${row.last_name}`.toLowerCase()
      const matchesSearch =
        !needle ||
        fullName.includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        row.message.toLowerCase().includes(needle)
      return matchesStatus && matchesSearch
    })
  }, [search, statusFilter, messagesQuery.data])

  function exportCsv() {
    const header = ['received', 'first_name', 'last_name', 'email', 'status', 'message']
    const lines = rows.map((row) =>
      [row.created_at, row.first_name, row.last_name, row.email, row.status, row.message]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'contact-messages.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Support"
        title="Messages"
        description="Contact form submissions, feedback, and customer support requests."
        actions={
          <Button type="button" variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, or message" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <MessageRow
                key={row.id}
                row={row}
                expanded={openId === row.id}
                onToggle={() => setOpenId((current) => (current === row.id ? null : row.id))}
                onStatusChange={(status) => updateMutation.mutate({ id: row.id, status })}
                onDelete={() => {
                  if (window.confirm(`Remove the message from ${row.email}?`)) deleteMutation.mutate(row.id)
                }}
              />
            ))}
          </tbody>
        </table>
        {messagesQuery.isError ? (
          <p className="p-8 text-sm text-neutral-600">
            Messages are not available yet. Apply the latest Supabase migration to enable the contact inbox.
          </p>
        ) : !rows.length ? (
          <p className="p-8 text-sm text-neutral-600">No messages match your filters.</p>
        ) : null}
      </div>
    </div>
  )
}

function MessageRow({
  row,
  expanded,
  onToggle,
  onStatusChange,
  onDelete,
}: {
  row: AdminContactMessageRow
  expanded: boolean
  onToggle: () => void
  onStatusChange: (status: AdminContactMessageStatus) => void
  onDelete: () => void
}) {
  const preview = row.message.length > 72 ? `${row.message.slice(0, 72).trim()}…` : row.message

  return (
    <>
      <tr className="border-t border-neutral-100 align-top">
        <td className="px-4 py-3 text-neutral-600">
          {new Date(row.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
        </td>
        <td className="px-4 py-3 font-medium text-neutral-900">
          {row.first_name} {row.last_name}
        </td>
        <td className="px-4 py-3 text-neutral-600">
          <a href={`mailto:${row.email}`} className="underline-offset-4 hover:underline">
            {row.email}
          </a>
        </td>
        <td className="px-4 py-3 text-neutral-600">
          <button type="button" onClick={onToggle} className="text-left hover:text-neutral-950">
            {expanded ? 'Hide message' : preview}
          </button>
        </td>
        <td className="px-4 py-3">
          <select
            value={row.status}
            onChange={(e) => onStatusChange(e.target.value as AdminContactMessageStatus)}
            className="w-full max-w-[140px] border border-neutral-300 bg-white px-2 py-1 text-xs"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            className="text-xs font-medium uppercase tracking-[0.15em] text-red-600 underline-offset-4 hover:underline"
            onClick={onDelete}
          >
            Remove
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-neutral-100 bg-neutral-50">
          <td colSpan={6} className="px-4 py-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{row.message}</p>
          </td>
        </tr>
      ) : null}
    </>
  )
}
