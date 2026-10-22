import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'

import { ROUTES } from '../../constants'
import { supabase } from '../../lib/supabase'
import {
  getPurchaseInbox,
  markPurchasesRead,
} from '../../services/purchaseNotificationService'
import { useAdminSession } from './AdminSessionContext'

export function AdminPurchaseNotifications() {
  const { user } = useAdminSession()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [liveUpdates, setLiveUpdates] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const queryKey = ['admin', 'purchase-notifications', user.id]
  const inbox = useQuery({
    queryKey,
    queryFn: getPurchaseInbox,
    refetchInterval: 15_000,
    staleTime: 5_000,
  })
  const markRead = useMutation({
    mutationFn: (ids: string[]) => markPurchasesRead(ids, user.id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'purchase-notifications', user.id],
      }),
  })

  useEffect(() => {
    if (!supabase) return
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'purchase-notifications', user.id],
      })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'dashboard-stats'],
      })
    }
    const channel = supabase
      .channel(`admin-purchases-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_purchase_notifications' },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_purchase_notification_reads',
          filter: `admin_id=eq.${user.id}`,
        },
        refresh,
      )
      .subscribe((status) => {
        setLiveUpdates(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') refresh()
      })
    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [user.id, queryClient])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false)
    }
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open])

  const count = inbox.data?.unreadCount
  const unread = inbox.data?.items.filter((item) => !item.is_read) ?? []
  return (
    <div className="relative ml-auto" ref={root}>
      <button
        type="button"
        aria-label={`Purchase notifications${count == null ? '' : `, ${count} unread`}`}
        aria-expanded={open}
        aria-controls="purchase-notification-panel"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center border border-white/30 text-white hover:bg-white/10"
      >
        <FiBell className="h-5 w-5" aria-hidden />
        {typeof count === 'number' && count > 0 ? (
          <span
            aria-live="polite"
            className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] leading-5 text-white"
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
        {inbox.isError ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1 text-xs text-black">
            !
          </span>
        ) : null}
      </button>
      {open ? (
        <section
          id="purchase-notification-panel"
          aria-label="New purchases"
          className="absolute -right-14 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] border border-neutral-200 bg-white text-neutral-950 shadow-xl md:right-0"
        >
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <h2 className="text-sm font-semibold">
              New purchases{count == null ? '' : ` (${count} unread)`}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs underline"
            >
              Close
            </button>
          </div>
          <p className="border-b px-4 py-2 text-[11px] text-neutral-500">
            {liveUpdates
              ? 'Live updates connected'
              : 'Checking for purchases every 15 seconds'}
          </p>
          {inbox.isError ? (
            <div className="p-4 text-sm text-rose-700">
              Notifications could not be refreshed.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void inbox.refetch()}
              >
                Retry
              </button>
            </div>
          ) : null}
          {inbox.isPending ? (
            <p className="p-4 text-sm">Loading purchases…</p>
          ) : null}
          {inbox.isSuccess && !inbox.data.items.length ? (
            <p className="p-4 text-sm text-neutral-600">
              No new purchases yet. Confirmed payments will appear here.
            </p>
          ) : null}
          <ul className="max-h-80 overflow-y-auto">
            {inbox.data?.items.map((item) => (
              <li
                key={item.order_id}
                className={`border-b p-4 ${item.is_read ? '' : 'bg-amber-50'}`}
              >
                <Link
                  to={ROUTES.adminOrders}
                  onClick={() => {
                    markRead.mutate([item.order_id])
                    setOpen(false)
                  }}
                  className="text-sm font-semibold underline-offset-4 hover:underline"
                >
                  {item.order_number ||
                    `KN-${item.order_id.slice(0, 8).toUpperCase()}`}
                  {item.is_read ? '' : ' · New'}
                </Link>
                <p className="mt-1 text-sm">
                  Payment confirmed ·{' '}
                  {new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: item.currency || 'CAD',
                  }).format(Number(item.total_amount))}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(item.created_at).toLocaleString()}
                </p>
                {item.email_last_error ? (
                  <p className="mt-1 text-xs text-amber-800">
                    Admin email pending delivery
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 p-4 text-xs">
            <Link
              to={ROUTES.adminOrders}
              onClick={() => setOpen(false)}
              className="underline"
            >
              View orders
            </Link>
            {unread.length ? (
              <button
                type="button"
                disabled={markRead.isPending}
                className="underline disabled:opacity-50"
                onClick={() =>
                  markRead.mutate(unread.map((item) => item.order_id))
                }
              >
                Mark shown as read
              </button>
            ) : null}
          </div>
          {markRead.isError ? (
            <p role="alert" className="px-4 pb-4 text-xs text-rose-700">
              Read status could not be saved. Please retry.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
