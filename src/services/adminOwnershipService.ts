import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { AdminRole } from '../lib/adminPermissions'

export type AdminTeamMemberRow = {
  id: string
  created_at: string
  email: string | null
  full_name: string | null
  is_admin: boolean
  admin_role: AdminRole | null
  is_owner: boolean
}

export type AdminOwnershipTransferRow = {
  id: string
  created_at: string
  responded_at: string | null
  from_user_id: string
  from_email: string
  to_user_id: string
  to_email: string
  note: string | null
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
}

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

/** Map a Postgres/PostgREST error thrown by a SECURITY DEFINER function into a plain message. */
function rpcError(error: { message: string } | null): never | void {
  if (error) throw new Error(error.message)
}

export async function adminListTeam(): Promise<AdminTeamMemberRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('profiles')
    .select('id, created_at, email, full_name, is_admin, admin_role, is_owner')
    .eq('is_admin', true)
    .order('is_owner', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as AdminTeamMemberRow[]
}

export async function adminGrantAdminRole(email: string, role: AdminRole): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('admin_grant_admin_role', {
    target_email: email.trim(),
    target_role: role,
  })
  rpcError(error)
}

export async function adminRequestOwnershipTransfer(email: string, note: string): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.rpc('admin_request_ownership_transfer', {
    target_email: email.trim(),
    note: note.trim() || null,
  })
  rpcError(error)
  return (data as { transfer_id: string } | null)?.transfer_id ?? ''
}

export async function adminCancelOwnershipTransfer(transferId: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('admin_cancel_ownership_transfer', { transfer_id: transferId })
  rpcError(error)
}

export async function adminRespondOwnershipTransfer(transferId: string, accept: boolean): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('admin_respond_ownership_transfer', {
    transfer_id: transferId,
    accept,
  })
  rpcError(error)
}

/** Outgoing pending transfer initiated by the current user (owner), if any. */
export async function listMyOutgoingTransfer(userId: string): Promise<AdminOwnershipTransferRow | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('admin_ownership_transfers')
    .select('id, created_at, responded_at, from_user_id, from_email, to_user_id, to_email, note, status')
    .eq('from_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as AdminOwnershipTransferRow | null) ?? null
}

/** Incoming pending transfer addressed to the current user, if any. */
export async function listMyIncomingTransfer(userId: string): Promise<AdminOwnershipTransferRow | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('admin_ownership_transfers')
    .select('id, created_at, responded_at, from_user_id, from_email, to_user_id, to_email, note, status')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as AdminOwnershipTransferRow | null) ?? null
}
