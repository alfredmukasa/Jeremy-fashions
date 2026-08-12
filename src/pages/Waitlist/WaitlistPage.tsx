import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { useWaitlistMode } from '../../context/WaitlistModeContext'
import { joinWaitlist } from '../../services/waitlistService'

import { Button } from '../../components/common/Button'
import { Container } from '../../components/layout/Container'
import { FieldLabel, Input } from '../../components/common/Input'
import { Seo } from '../../components/seo/Seo'
import { cn } from '../../utils/cn'

const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
})

type WaitlistFormValues = z.infer<typeof waitlistSchema>

/** Pins the page to the light surface palette so it always renders on white, independent of the site theme toggle. */
const LIGHT_SURFACE_STYLE = {
  '--surface-base': '#ffffff',
  '--surface-elevated': '#ffffff',
  '--surface-muted': '#f4f4f4',
  '--text-primary': '#1a1a1a',
  '--text-secondary': '#5a5a5a',
  '--text-muted': '#8a8a8a',
  '--border-subtle': 'rgba(26, 26, 26, 0.07)',
  '--border-strong': 'rgba(26, 26, 26, 0.13)',
  '--accent': '#1a1a1a',
  '--accent-contrast': '#ffffff',
} as CSSProperties

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-rose-600">{message}</p>
}

export default function WaitlistPage() {
  const { waitlistMode } = useWaitlistMode()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: WaitlistFormValues) {
    const result = await joinWaitlist({ email: values.email })

    if (result.ok) {
      toast.success('You\'re on the list.')
      reset()
      return
    }

    if (result.reason === 'duplicate') {
      toast(result.message, { icon: '✓' })
    } else {
      toast.error(result.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div
      className="flex min-h-[calc(100svh-var(--header-offset)-var(--announcement-height))] items-center justify-center bg-white px-4 sm:px-6"
      style={LIGHT_SURFACE_STYLE}
    >
      <Seo
        title={waitlistMode ? 'Private access' : 'Waitlist'}
        description="Join the KREWNOX waitlist for early access to new drops and restocks."
        path="/waitlist"
      />
      <Container className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-xl"
        >
          <h1 className="text-center font-serif text-3xl tracking-[0.03em] text-neutral-950 sm:text-4xl">
            Join the waitlist
          </h1>

          {/* Single pill-shaped control: email input + submit read as one unified
              waitlist control, matching the reference. The label moves to sr-only +
              placeholder so the row stays compact; validation, submit handling, and
              the underlying joinWaitlist() flow are unchanged. */}
          <form onSubmit={handleSubmit(onSubmit)} className="mt-10" noValidate>
            <div
              className={cn(
                'flex flex-col gap-2 rounded-[1.75rem] border bg-[var(--surface-elevated)] p-2 shadow-[var(--shadow-soft)] transition-colors focus-within:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:py-2 sm:pl-6 sm:pr-2',
                errors.email ? 'border-rose-300' : 'border-[var(--border-subtle)] focus-within:border-[var(--border-strong)]',
              )}
            >
              {/* Focus indication is unified on the outer pill (focus-within above) rather
                  than the input's own default focus ring, so the control keeps reading as
                  one piece instead of showing a smaller rectangle inside the pill. */}
              <div className="flex-1">
                <FieldLabel id="email" className="sr-only">
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Your email address"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.email)}
                  className="border-transparent bg-transparent px-3! py-2.5! focus:border-transparent! disabled:opacity-60 sm:px-0!"
                  {...register('email')}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn('self-start shrink-0', isSubmitting && 'opacity-70')}
              >
                {isSubmitting ? 'Submitting…' : 'Join'}
              </Button>
            </div>

            <div className="mt-3 px-2" aria-live="polite">
              <FieldError message={errors.email?.message} />
            </div>
          </form>
        </motion.div>
      </Container>
    </div>
  )
}
