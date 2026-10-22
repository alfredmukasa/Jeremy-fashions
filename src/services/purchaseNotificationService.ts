import { supabase } from '../lib/supabase'

export type PurchaseNotification = {
  order_id: string
  created_at: string
  order_number: string | null
  total_amount: number
  currency: string | null
  is_read: boolean
  email_sent_at: string | null
  email_last_error: string | null
}
export type PurchaseInbox = {
  unreadCount: number
  items: PurchaseNotification[]
}

export async function purchaseNotificationRequest<T>(
  path: 'status' | 'test',
  method = 'GET',
): Promise<T> {
  const session = await supabase?.auth.getSession()
  const token = session?.data.session?.access_token
  if (!token) throw new Error('Sign in again to manage purchase alerts.')
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  const response = await fetch(`${base}/admin/purchase-notifications/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  })
  const result = await response.json()
  if (!response.ok)
    throw new Error(result.error || 'Purchase notification request failed.')
  return result as T
}

export type PurchaseConnectionStatus = {
  databaseConnected: boolean
  emailConfigured: boolean
}

export async function getPurchaseInbox(): Promise<PurchaseInbox> {
  if (!supabase) throw new Error('Database connection is unavailable.')
  const { data, error } = await supabase.rpc('admin_purchase_inbox')
  if (error)
    throw new Error('Purchase notifications could not be loaded. Try again.')
  return data as PurchaseInbox
}

export async function markPurchasesRead(orderIds: string[], adminId: string) {
  if (!supabase) throw new Error('Database connection is unavailable.')
  const { error } = await supabase
    .from('admin_purchase_notification_reads')
    .upsert(
      orderIds.map((order_id) => ({ order_id, admin_id: adminId })),
      { onConflict: 'order_id,admin_id', ignoreDuplicates: true },
    )
  if (error)
    throw new Error('Notifications could not be marked read. Try again.')
}
