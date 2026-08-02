import { useEffect, type CSSProperties } from 'react'
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
import { cn } from '../../utils/cn'

const waitlistSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.'),
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
  return <p className="mt-2 text-xs text-rose-600">{message}</p>
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
    defaultValues: { fullName: '', email: '' },
  })

  useEffect(() => {
    document.title = waitlistMode ? 'Private access — Jeremy Atelier' : 'Waitlist — Jeremy Atelier'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', 'Join the Jeremy Atelier waitlist.')
    }
  }, [waitlistMode])

  async function onSubmit(values: WaitlistFormValues) {
    const result = await joinWaitlist({ fullName: values.fullName, email: values.email })

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
      <Container className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-sm"
        >
          <h1 className="text-center font-serif text-2xl tracking-[0.03em] text-neutral-950">
            Join the waitlist
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6" noValidate>
            <div>
              <FieldLabel id="fullName">Full name</FieldLabel>
              <Input
                id="fullName"
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
                {...register('fullName')}
              />
              <FieldError message={errors.fullName?.message} />
            </div>

            <div>
              <FieldLabel id="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <Button
              type="submit"
              className={cn('w-full', isSubmitting && 'pointer-events-none opacity-70')}
            >
              {isSubmitting ? 'Submitting…' : 'Join the waitlist'}
            </Button>
          </form>
        </motion.div>
      </Container>
    </div>
  )
}
