import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineCheck, HiOutlineShieldExclamation } from 'react-icons/hi2'
import toast from 'react-hot-toast'

import { adminRequestOwnershipTransfer } from '../../services/adminOwnershipService'
import { Button } from '../common/Button'

type Phase = 'form' | 'submitting' | 'success'

export function TransferControlModal({
  open,
  onClose,
  onTransferred,
}: {
  open: boolean
  onClose: () => void
  onTransferred: () => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const [phase, setPhase] = useState<Phase>('form')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')

  function reset() {
    setPhase('form')
    setEmail('')
    setNote('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && phase !== 'submitting') handleClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase])

  if (!open) return null

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return
    setPhase('submitting')
    try {
      await adminRequestOwnershipTransfer(email, note)
      setPhase('success')
      onTransferred()
      window.setTimeout(handleClose, 1600)
    } catch (err) {
      setPhase('form')
      toast.error(err instanceof Error ? err.message : 'Could not start the transfer.')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-neutral-950/60 backdrop-blur-[1px]"
        aria-label="Close transfer control dialog"
        onClick={() => phase !== 'submitting' && handleClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md overflow-hidden rounded-sm border border-neutral-200 bg-white p-8 shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {phase === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-950 text-white"
              >
                <motion.span
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
                >
                  <HiOutlineCheck className="h-8 w-8" aria-hidden />
                </motion.span>
              </motion.span>
              <h2 className="mt-6 font-serif text-2xl text-neutral-950">Transfer sent</h2>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-600">
                {email} will see a notification on their account to accept control.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={(e) => void submit(e)}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                <HiOutlineShieldExclamation className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">
                Transfer control
              </p>
              <h2 id={titleId} className="mt-2 font-serif text-2xl text-neutral-950">
                Hand over admin ownership
              </h2>
              <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-neutral-600">
                They&apos;ll get a notification on their account to accept. You keep your existing admin access —
                you just stop being the primary owner once they accept.
              </p>

              <label className="mt-6 block text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                Their account email
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@email.com"
                  className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm normal-case tracking-normal text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
                />
              </label>

              <label className="mt-4 block text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                Note (optional)
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Anything they should know before accepting"
                  className="mt-2 w-full resize-none border border-neutral-300 bg-white px-4 py-3 text-sm normal-case tracking-normal text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
                />
              </label>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={handleClose} disabled={phase === 'submitting'}>
                  Cancel
                </Button>
                <Button type="submit" disabled={phase === 'submitting' || !email.trim()}>
                  {phase === 'submitting' ? 'Sending…' : 'Send transfer'}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>,
    document.body,
  )
}
