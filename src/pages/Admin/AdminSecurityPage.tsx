import { useQuery } from '@tanstack/react-query'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { adminListAuditLogs } from '../../services/adminService'

export default function AdminSecurityPage() {
  return (
    <RequireAdminPermission permission="security.view">
      <AdminSecurityContent />
    </RequireAdminPermission>
  )
}

function AdminSecurityContent() {
  const auditQuery = useQuery({ queryKey: ['admin', 'audit-logs'], queryFn: adminListAuditLogs })

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Security"
        title="Audit log"
        description="Recent privileged actions recorded from the admin panel."
      />

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {(auditQuery.data ?? []).map((entry) => (
              <tr key={entry.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 text-neutral-600">
                  {new Date(entry.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 text-neutral-900">{entry.actor_email ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-700">{entry.action}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {entry.entity_type ?? '—'}
                  {entry.entity_id ? ` · ${entry.entity_id}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {auditQuery.isError ? (
          <p className="p-8 text-sm text-neutral-600">
            Audit logs are unavailable until the admin security migration is applied.
          </p>
        ) : !auditQuery.data?.length ? (
          <p className="p-8 text-sm text-neutral-600">No audit events yet.</p>
        ) : null}
      </div>
    </div>
  )
}
