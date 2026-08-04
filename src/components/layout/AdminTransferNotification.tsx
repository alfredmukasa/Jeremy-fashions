import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineBell, HiOutlineCheck, HiOutlineXMark } from 'react-icons/hi2'

import { useAdminTransferInbox, useRespondAdminTransfer } from '../../hooks/useAdminTransferInbox'
import { cn } from '../../utils/cn'

/**
 * Bell icon that appears only when the signed-in user has a pending admin
 * ownership-transfer request addressed to them. Lives in the storefront
 * Navbar so it's visible site-wide, including on their account page.
 */
export function AdminTransferNotification({ tone }: { tone: 'light' | 'dark' }) {
  const { data: transfer } = useAdminTransferInbox()
  const respond = useRespondAdminTransfer()
  const [open, setOpen] = useState(false)

  if (!transfer) return null

  function handle(accept: boolean) {
    respond.mutate(
      { transferId: transfer!.id, accept },
      { onSuccess: () => setOpen(false) },
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications: admin control offer pending"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative inline-flex shrink-0 p-2 transition-opacity duration-300 hover:opacity-60',
          tone === 'light' ? 'text-white' : 'text-neutral-900',
        )}
      >
        <motion.span
          className="inline-flex"
          animate={{ rotate: [0, -12, 10, -8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
        >
          <HiOutlineBell className="h-5 w-5" aria-hidden />
        </motion.span>
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white"
        />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close notifications"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-full z-50 mt-3 w-[min(380px,90vw)] rounded-sm border border-neutral-200 bg-white p-6 text-left text-neutral-900 shadow-xl"
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Admin control</p>
              <h3 className="mt-2 font-serif text-xl text-neutral-950">You&apos;ve been offered control</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                <span className="font-medium text-neutral-900">{transfer.from_email}</span> wants to hand over
                admin ownership of the store to your account.
              </p>
              {transfer.note ? (
                <p className="mt-3 border-l-2 border-neutral-200 pl-3 text-sm italic leading-relaxed text-neutral-600">
                  &ldquo;{transfer.note}&rdquo;
                </p>
              ) : null}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  disabled={respond.isPending}
                  onClick={() => handle(true)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <HiOutlineCheck className="h-4 w-4" aria-hidden />
                  {respond.isPending ? 'Working…' : 'Accept'}
                </button>
                <button
                  type="button"
                  disabled={respond.isPending}
                  onClick={() => handle(false)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-950 disabled:opacity-50"
                >
                  <HiOutlineXMark className="h-4 w-4" aria-hidden />
                  Decline
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
