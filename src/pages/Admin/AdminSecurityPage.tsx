import { useQuery } from '@tanstack/react-query'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { fetchApiHealth } from '../../lib/apiHealth'
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
  const healthQuery = useQuery({
    queryKey: ['admin', 'api-health'],
    queryFn: fetchApiHealth,
    staleTime: 60_000,
  })
  const health = healthQuery.data

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Security"
        title="Audit log"
        description="Recent privileged actions recorded from the admin panel."
      />

      <section className="border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Payment API</p>
        {healthQuery.isLoading ? (
          <p className="mt-3">Checking payment API health…</p>
        ) : health ? (
          <ul className="mt-3 space-y-2">
            <li>{health.stripeWebhookConfigured ? 'Stripe webhook secret is configured.' : 'Stripe webhook secret is missing. Paid orders may not confirm automatically.'}</li>
            <li>{health.guestCheckoutAvailable ? 'Guest checkout service role is configured.' : 'Guest checkout needs SUPABASE_SERVICE_ROLE_KEY on the payment API.'}</li>
            <li>{health.contactEmailConfigured ? 'Contact email delivery is configured.' : 'Contact email delivery is not configured (Resend).'}</li>
          </ul>
        ) : (
          <p className="mt-3">Could not reach the payment API health endpoint.</p>
        )}
        <p className="mt-4 text-xs text-neutral-500">
          Staff sign-in lockout is local to this browser. Real access control is the admin JWT role plus allowed emails.
          Enable leaked-password protection in the Supabase Auth settings.
        </p>
      </section>

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
