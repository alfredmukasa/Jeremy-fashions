import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { adminListProfiles, adminUpdateProfileStatus } from '../../services/adminService'

export default function AdminUsersPage() {
  return (
    <RequireAdminPermission permission="users.manage">
      <AdminUsersContent />
    </RequireAdminPermission>
  )
}

function AdminUsersContent() {
  const queryClient = useQueryClient()
  const profilesQuery = useQuery({ queryKey: ['admin', 'profiles'], queryFn: adminListProfiles })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' | 'banned' }) =>
      adminUpdateProfileStatus(id, status),
    onSuccess: () => {
      toast.success('Account status updated')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  })

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Customers"
        title="User management"
        description="Review registered customers and suspend or ban accounts when needed."
      />

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(profilesQuery.data ?? []).map((user) => (
              <tr key={user.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 text-neutral-600">
                  {new Date(user.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-900">{user.email ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-600">{user.full_name || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.account_status ?? 'active'}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: user.id,
                        status: e.target.value as 'active' | 'suspended' | 'banned',
                      })
                    }
                    className="w-full max-w-[140px] border border-neutral-300 bg-white px-2 py-1 text-xs capitalize"
                  >
                    {['active', 'suspended', 'banned'].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!profilesQuery.data?.length ? (
          <p className="p-8 text-sm text-neutral-600">No profile rows yet — register a customer account to test.</p>
        ) : null}
      </div>
    </div>
  )
}
