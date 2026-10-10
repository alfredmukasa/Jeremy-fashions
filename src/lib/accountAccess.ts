import { ACCOUNT_BLOCKED_MESSAGE } from './authErrors'
import { isSupabaseConfigured, supabase } from './supabase'

const claimedUsers = new Set<string>()

export async function isAccountBlocked(userId: string): Promise<boolean> {
  if (!userId || !isSupabaseConfigured || !supabase) return false

  const { data, error } = await supabase.rpc('account_is_blocked')
  if (!error && typeof data === 'boolean') return data

  const profile = await supabase
    .from('profiles')
    .select('suspended, account_status')
    .eq('id', userId)
    .maybeSingle()

  if (profile.error || !profile.data) return false
  const status = String(profile.data.account_status ?? 'active').toLowerCase()
  return profile.data.suspended === true || status === 'suspended' || status === 'banned'
}

export async function enforceActiveAccount(userId: string): Promise<Error | null> {
  const blocked = await isAccountBlocked(userId)
  if (!blocked) return null
  if (supabase) {
    await supabase.auth.signOut()
  }
  return new Error(ACCOUNT_BLOCKED_MESSAGE)
}

export async function claimGuestOrders(userId: string): Promise<void> {
  if (!userId || !isSupabaseConfigured || !supabase || claimedUsers.has(userId)) return
  claimedUsers.add(userId)
  const { error } = await supabase.rpc('claim_guest_orders')
  if (error) {
    claimedUsers.delete(userId)
    console.error('[accountAccess.claimGuestOrders]', error.message)
  }
}

export async function afterAuthenticatedSession(userId: string): Promise<Error | null> {
  const blocked = await enforceActiveAccount(userId)
  if (blocked) return blocked
  void claimGuestOrders(userId)
  return null
}
