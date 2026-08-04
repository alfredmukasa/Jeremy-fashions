import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { ROUTES } from '../constants'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { adminRespondOwnershipTransfer, listMyIncomingTransfer } from '../services/adminOwnershipService'

/** Polls for a pending "control transfer" addressed to the signed-in user. */
export function useAdminTransferInbox() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['admin-ownership-transfer', 'incoming', user?.id],
    queryFn: () => listMyIncomingTransfer(user!.id),
    enabled: Boolean(user?.id) && isSupabaseConfigured,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

/** Shared accept/decline mutation used by both the navbar bell and the account-page banner. */
export function useRespondAdminTransfer() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async ({ transferId, accept }: { transferId: string; accept: boolean }) => {
      await adminRespondOwnershipTransfer(transferId, accept)
      if (accept) {
        await supabase?.auth.refreshSession()
      }
      return accept
    },
    onSuccess: (accepted) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-ownership-transfer'] })
      if (accepted) {
        toast.success('You now have admin control.')
        navigate(ROUTES.admin)
      } else {
        toast.success('Transfer declined.')
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Something went wrong. Try again.'),
  })
}
