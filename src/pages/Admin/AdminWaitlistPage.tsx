import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { adminDeleteWaitlistEntry, adminListWaitlist, adminUpdateWaitlistStatus } from '../../services/adminService'

export default function AdminWaitlistPage() {
  return (
    <RequireAdminPermission permission="waitlist.manage">
      <AdminWaitlistContent />
    </RequireAdminPermission>
  )
}

function AdminWaitlistContent() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const waitlistQuery = useQuery({ queryKey: ['admin', 'waitlist'], queryFn: adminListWaitlist })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminUpdateWaitlistStatus(id, status),
    onSuccess: () => {
      toast.success('Waitlist updated')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'waitlist'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteWaitlistEntry,
    onSuccess: () => {
      toast.success('Entry removed')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'waitlist'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  })

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (waitlistQuery.data ?? []).filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter
      const matchesSearch =
        !needle ||
        row.full_name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        (row.phone ?? '').toLowerCase().includes(needle)
      return matchesStatus && matchesSearch
    })
  }, [search, statusFilter, waitlistQuery.data])

  function exportCsv() {
    const header = ['joined', 'name', 'email', 'phone', 'product_id', 'status']
    const lines = rows.map((row) =>
      [
        row.created_at,
        row.full_name,
        row.email,
        row.phone ?? '',
        row.interested_product ?? '',
        row.status,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'waitlist-export.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Growth"
        title="Waitlist"
        description="Search, filter, export, and update waitlist signups."
        actions={
          <Button type="button" variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {['pending', 'notified', 'converted', 'archived'].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Product id</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 text-neutral-600">
                  {new Date(row.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-900">{row.full_name}</td>
                <td className="px-4 py-3 text-neutral-600">{row.email}</td>
                <td className="px-4 py-3 text-neutral-600">{row.phone ?? '—'}</td>
                <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-neutral-500">
                  {row.interested_product ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={row.status}
                    onChange={(e) => updateMutation.mutate({ id: row.id, status: e.target.value })}
                    className="w-full max-w-[140px] border border-neutral-300 bg-white px-2 py-1 text-xs"
                  >
                    {['pending', 'notified', 'converted', 'archived'].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-xs font-medium uppercase tracking-[0.15em] text-red-600 underline-offset-4 hover:underline"
                    onClick={() => {
                      if (window.confirm(`Remove ${row.email} from the waitlist?`)) deleteMutation.mutate(row.id)
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="p-8 text-sm text-neutral-600">No waitlist entries match your filters.</p> : null}
      </div>
    </div>
  )
}
