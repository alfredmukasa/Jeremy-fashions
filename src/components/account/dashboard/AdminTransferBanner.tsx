import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineCheck, HiOutlineShieldCheck, HiOutlineXMark } from 'react-icons/hi2'

import { useAdminTransferInbox, useRespondAdminTransfer } from '../../../hooks/useAdminTransferInbox'
import { Container } from '../../layout/Container'

/**
 * Full-width call-to-action shown at the top of the account page when the
 * signed-in user has a pending admin ownership-transfer request waiting for
 * them — the same offer surfaced compactly in the navbar bell, but harder to
 * miss the moment they open their account.
 */
export function AdminTransferBanner() {
  const { data: transfer } = useAdminTransferInbox()
  const respond = useRespondAdminTransfer()

  return (
    <AnimatePresence>
      {transfer ? (
        <div className="border-b border-neutral-200 bg-neutral-950">
          <Container className="py-5">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                  <HiOutlineShieldCheck className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/50">Admin control</p>
                  <p className="mt-1 text-sm leading-relaxed text-white">
                    <span className="font-medium">{transfer.from_email}</span> wants to transfer admin ownership to
                    your account.
                    {transfer.note ? <span className="text-white/60"> &ldquo;{transfer.note}&rdquo;</span> : null}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 pl-12 sm:pl-0">
                <button
                  type="button"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate({ transferId: transfer.id, accept: true })}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-950 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <HiOutlineCheck className="h-4 w-4" aria-hidden />
                  {respond.isPending ? 'Working…' : 'Accept'}
                </button>
                <button
                  type="button"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate({ transferId: transfer.id, accept: false })}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-white/50 hover:text-white disabled:opacity-50"
                >
                  <HiOutlineXMark className="h-4 w-4" aria-hidden />
                  Decline
                </button>
              </div>
            </motion.div>
          </Container>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
