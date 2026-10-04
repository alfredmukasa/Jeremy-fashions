import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { useAuth } from '../../context/AuthContext'
import { submitContactMessage } from '../../services/contactService'

import { Button } from '../../components/common/Button'
import { Container } from '../../components/layout/Container'
import { FieldLabel, Input, Textarea } from '../../components/common/Input'
import { Seo } from '../../components/seo/Seo'

const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(80, 'First name is too long.'),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(80, 'Last name is too long.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  message: z
    .string()
    .trim()
    .min(10, 'Please share a little more so we can help.')
    .max(4000, 'Please keep your message under 4,000 characters.'),
  website: z.string().optional(),
})

type ContactFormValues = z.infer<typeof contactSchema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-rose-600">{message}</p>
}

function splitFullName(fullName: unknown): { firstName: string; lastName: string } {
  if (typeof fullName !== 'string' || !fullName.trim()) {
    return { firstName: '', lastName: '' }
  }
  const parts = fullName.trim().split(/\s+/)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

export default function ContactPage() {
  const { user } = useAuth()
  const [sent, setSent] = useState(false)
  const defaults = useMemo(() => {
    const names = splitFullName(user?.user_metadata?.full_name)
    return {
      firstName: names.firstName,
      lastName: names.lastName,
      email: user?.email ?? '',
      message: '',
      website: '',
    }
  }, [user])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    reset((current) => ({
      ...current,
      firstName: current.firstName || defaults.firstName,
      lastName: current.lastName || defaults.lastName,
      email: current.email || defaults.email,
    }))
  }, [defaults, reset])

  async function onSubmit(values: ContactFormValues) {
    if (values.website?.trim()) {
      setSent(true)
      toast.success('Message sent. We will get back to you soon.')
      return
    }

    const result = await submitContactMessage({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      message: values.message,
    })

    if (!result.ok) {
      toast.error(result.message)
      return
    }

    setSent(true)
    toast.success('Message sent. We will get back to you soon.')
  }

  return (
    <div className="bg-[var(--surface-base)] pb-24 pt-10 sm:pt-16">
      <Seo
        title="Contact us"
        description="Reach Krewnox support for orders, sizing, returns, and anything else we can help with."
        path="/contact"
      />
      <Container className="max-w-5xl">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-[var(--text-muted)]">Support</p>
        <h1 className="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-5xl">Contact us</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          Questions about an order, a fit, or a recent drop? Send a note and our team will follow up by email.
          You do not need an account — guests and members can both write to us.
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="space-y-8 border-t border-[var(--border-subtle)] pt-8 lg:border-t-0 lg:pt-0">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Email
              </p>
              <a
                href="mailto:support@krewnox.ca"
                className="mt-2 inline-block text-sm text-[var(--text-primary)] underline-offset-4 hover:underline"
              >
                support@krewnox.ca
              </a>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Hours
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                We typically reply within one to two business days.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                What to include
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                Order numbers, sizes, and photos help us respond faster — especially for returns or damaged items.
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 sm:p-8"
          >
            {sent ? (
              <div className="space-y-5">
                <h2 className="font-serif text-2xl text-[var(--text-primary)]">Message received</h2>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  Thank you. We have your note and will reply to the email you provided.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSent(false)
                    reset({ ...defaults, message: '' })
                  }}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel id="contact-first">First name</FieldLabel>
                    <Input
                      id="contact-first"
                      autoComplete="given-name"
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.firstName)}
                      {...register('firstName')}
                    />
                    <FieldError message={errors.firstName?.message} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel id="contact-last">Last name</FieldLabel>
                    <Input
                      id="contact-last"
                      autoComplete="family-name"
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.lastName)}
                      {...register('lastName')}
                    />
                    <FieldError message={errors.lastName?.message} />
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel id="contact-email">Email</FieldLabel>
                  <Input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.email)}
                    {...register('email')}
                  />
                  <FieldError message={errors.email?.message} />
                </div>

                <div className="space-y-2">
                  <FieldLabel id="contact-message">Message</FieldLabel>
                  <Textarea
                    id="contact-message"
                    rows={6}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.message)}
                    placeholder="How can we help?"
                    {...register('message')}
                  />
                  <FieldError message={errors.message?.message} />
                </div>

                <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
                  <label htmlFor="contact-website">Website</label>
                  <input id="contact-website" tabIndex={-1} autoComplete="off" {...register('website')} />
                </div>

                <Button type="submit" disabled={isSubmitting} className={isSubmitting ? 'opacity-70' : undefined}>
                  {isSubmitting ? 'Sending…' : 'Send message'}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </Container>
    </div>
  )
}
