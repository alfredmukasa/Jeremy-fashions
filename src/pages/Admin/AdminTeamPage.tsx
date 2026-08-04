import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiAward } from 'react-icons/fi'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { useAdminSession } from '../../components/admin/AdminSessionContext'
import { TransferControlModal } from '../../components/admin/TransferControlModal'
import { Button } from '../../components/common/Button'
import { isAppOwner } from '../../lib/adminAuth'
import { ADMIN_ROLES, type AdminRole } from '../../lib/adminPermissions'
import {
  adminCancelOwnershipTransfer,
  adminGrantAdminRole,
  adminListTeam,
  listMyOutgoingTransfer,
} from '../../services/adminOwnershipService'

export default function AdminTeamPage() {
  return (
    <RequireAdminPermission permission="admins.manage">
      <AdminTeamContent />
    </RequireAdminPermission>
  )
}

function AdminTeamContent() {
  const session = useAdminSession()
  const owner = isAppOwner(session.user)
  const queryClient = useQueryClient()

  const teamQuery = useQuery({ queryKey: ['admin', 'team'], queryFn: adminListTeam })
  const outgoingQuery = useQuery({
    queryKey: ['admin-ownership-transfer', 'outgoing', session.user.id],
    queryFn: () => listMyOutgoingTransfer(session.user.id),
    enabled: owner,
  })

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminRole>('SUPPORT_ADMIN')
  const [transferOpen, setTransferOpen] = useState(false)

  const grantMutation = useMutation({
    mutationFn: () => adminGrantAdminRole(email, role),
    onSuccess: () => {
      toast.success(`${email} now has admin access.`)
      setEmail('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'team'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not add that admin.'),
  })

  const cancelMutation = useMutation({
    mutationFn: (transferId: string) => adminCancelOwnershipTransfer(transferId),
    onSuccess: () => {
      toast.success('Transfer cancelled.')
      void queryClient.invalidateQueries({ queryKey: ['admin-ownership-transfer', 'outgoing'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not cancel the transfer.'),
  })

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Team"
        title="Admin team"
        description="Everyone with access to the admin dashboard, and who currently holds primary control."
      />

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Since</th>
            </tr>
          </thead>
          <tbody>
            {(teamQuery.data ?? []).map((member) => (
              <tr key={member.id} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {member.is_owner ? (
                      <span title="Current owner" className="text-amber-500">
                        <FiAward className="h-4 w-4" aria-hidden />
                      </span>
                    ) : null}
                    <div>
                      <p className="font-medium text-neutral-900">{member.full_name || '—'}</p>
                      <p className="text-xs text-neutral-500">{member.email ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {member.is_owner ? 'Owner · ' : ''}
                  {(member.admin_role ?? 'SUPER_ADMIN').replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {new Date(member.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!teamQuery.data?.length ? <p className="p-8 text-sm text-neutral-600">No admins yet.</p> : null}
      </div>

      {owner ? (
        <>
          <section className="border border-neutral-200 bg-white p-6 sm:p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Add admin</p>
            <h2 className="mt-2 font-serif text-2xl text-neutral-950">Grant admin access</h2>
            <p className="mt-2 max-w-xl text-sm text-neutral-600">
              They need an existing storefront account first — grant access by the email they registered with.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (email.trim()) grantMutation.mutate()
              }}
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@email.com"
                className="min-w-0 flex-1 border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                className="border border-neutral-300 bg-white px-3 py-3 text-xs uppercase tracking-[0.1em] text-neutral-900"
              >
                {ADMIN_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={grantMutation.isPending || !email.trim()}>
                {grantMutation.isPending ? 'Adding…' : 'Add admin'}
              </Button>
            </form>
          </section>

          <section className="border border-neutral-200 bg-white p-6 sm:p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Ownership</p>
            <h2 className="mt-2 font-serif text-2xl text-neutral-950">Transfer control</h2>
            <p className="mt-2 max-w-xl text-sm text-neutral-600">
              Hand primary ownership to another admin or teammate. They&apos;ll get a notification on their account
              to accept — nothing changes until they do.
            </p>

            {outgoingQuery.data ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-neutral-200 bg-neutral-50 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Pending — {outgoingQuery.data.to_email}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Sent {new Date(outgoingQuery.data.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(outgoingQuery.data!.id)}
                >
                  {cancelMutation.isPending ? 'Cancelling…' : 'Cancel transfer'}
                </Button>
              </div>
            ) : (
              <Button type="button" className="mt-6" onClick={() => setTransferOpen(true)}>
                Transfer control
              </Button>
            )}
          </section>
        </>
      ) : (
        <div className="border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
          Only the current owner can add admins or transfer control. That&apos;s marked with{' '}
          <FiAward className="inline h-3.5 w-3.5 text-amber-500" aria-hidden /> above.
        </div>
      )}

      <TransferControlModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onTransferred={() => void queryClient.invalidateQueries({ queryKey: ['admin-ownership-transfer', 'outgoing'] })}
      />
    </div>
  )
}
