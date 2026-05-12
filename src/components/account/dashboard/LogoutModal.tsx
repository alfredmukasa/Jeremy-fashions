import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '../../common/Button'

export function LogoutModal({
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[1px]"
        aria-label="Close sign out dialog"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-sm border border-neutral-200 bg-white p-6 shadow-xl sm:p-8"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Sign out</p>
        <h2 id={titleId} className="mt-3 font-serif text-3xl text-neutral-950">
          Leave your studio?
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-neutral-600">
          You will be signed out on this device. Your bag and saved pieces remain on this browser until you clear them.
        </p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={busy} autoFocus>
            Stay signed in
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
