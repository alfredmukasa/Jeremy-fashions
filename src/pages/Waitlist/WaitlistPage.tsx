import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useProducts } from '../../hooks/useCatalog'
import { joinWaitlist } from '../../services/waitlistService'

import { Button } from '../../components/common/Button'
import { Container } from '../../components/layout/Container'
import { FieldLabel, Input } from '../../components/common/Input'
import { SectionHeading } from '../../components/common/SectionHeading'
import { cn } from '../../utils/cn'

const phoneRegex = /^[+()0-9 \-.]{7,}$/

const waitlistSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Please enter your full name.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || phoneRegex.test(v), 'Enter a valid phone number.'),
  interestedProductId: z.string().optional(),
  notes: z.string().max(280, 'Keep notes under 280 characters.').optional(),
})

type WaitlistFormValues = z.infer<typeof waitlistSchema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-2 text-xs text-rose-600">{message}</p>
}

export default function WaitlistPage() {
  const [searchParams] = useSearchParams()
  const presetSlug = searchParams.get('product') ?? ''

  const { data: products } = useProducts()

  const productOptions = useMemo(() => products ?? [], [products])

  const presetProduct = useMemo(
    () => productOptions.find((p) => p.slug === presetSlug),
    [productOptions, presetSlug],
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      interestedProductId: '',
      notes: '',
    },
  })

  // When products load (or a slug is in the URL), auto-select the right option.
  useEffect(() => {
    if (presetProduct) {
      setValue('interestedProductId', presetProduct.id)
    }
  }, [presetProduct, setValue])

  const watchedProductId = useWatch({ control, name: 'interestedProductId' })
  const watchedProduct = useMemo(
    () => productOptions.find((p) => p.id === watchedProductId),
    [productOptions, watchedProductId],
  )

  async function onSubmit(values: WaitlistFormValues) {
    const result = await joinWaitlist({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      interestedProductId: values.interestedProductId || undefined,
    })

    if (result.ok) {
      toast.success('You\'re on the list — we\'ll be in touch with early access.')
      reset({
        fullName: '',
        email: '',
        phone: '',
        interestedProductId: values.interestedProductId,
        notes: '',
      })
      return
    }

    if (result.reason === 'duplicate') {
      toast(result.message, { icon: '✓' })
    } else {
      toast.error(result.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="pb-24">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-16 md:py-20">
          <SectionHeading
            eyebrow="Waitlist"
            title="Reserve early access."
            subtitle="Tell us which piece you have your eye on. Members receive a private discount code when restocks land."
          />
        </Container>
      </div>

      <Container className="py-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
            noValidate
          >
            <div>
              <FieldLabel id="fullName">Full name</FieldLabel>
              <Input
                id="fullName"
                autoComplete="name"
                placeholder="Maya Lin"
                aria-invalid={Boolean(errors.fullName)}
                {...register('fullName')}
              />
              <FieldError message={errors.fullName?.message} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <FieldLabel id="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@studio.com"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
                <FieldError message={errors.email?.message} />
              </div>

              <div>
                <FieldLabel id="phone">Phone (optional)</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 555 0123"
                  aria-invalid={Boolean(errors.phone)}
                  {...register('phone')}
                />
                <FieldError message={errors.phone?.message} />
              </div>
            </div>

            <div>
              <FieldLabel id="interestedProductId">Interested piece</FieldLabel>
              <select
                id="interestedProductId"
                {...register('interestedProductId')}
                className={cn(
                  'w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none',
                  'transition focus:border-neutral-900',
                )}
              >
                <option value="">No preference — notify me of any drop</option>
                {productOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {watchedProduct ? (
                <p className="mt-2 text-xs text-neutral-500">
                  We&rsquo;ll prioritise restock alerts for {watchedProduct.name}.
                </p>
              ) : null}
            </div>

            <div>
              <FieldLabel id="notes">Notes (optional)</FieldLabel>
              <textarea
                id="notes"
                rows={3}
                placeholder="Sizing, colour preference, shipping window…"
                className={cn(
                  'w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none',
                  'transition placeholder:text-neutral-400 focus:border-neutral-900',
                )}
                {...register('notes')}
              />
              <FieldError message={errors.notes?.message} />
            </div>

            <div className="flex flex-col items-start gap-3 pt-2 sm:flex-row sm:items-center">
              <Button
                type="submit"
                className={cn('min-w-[200px]', isSubmitting && 'pointer-events-none opacity-70')}
              >
                {isSubmitting ? 'Submitting…' : 'Join the waitlist'}
              </Button>
              <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                We never share your details.
              </p>
            </div>

            {isSubmitSuccessful ? (
              <p className="text-xs text-emerald-700">
                Confirmation sent. Watch your inbox for a private discount code when stock lands.
              </p>
            ) : null}
          </motion.form>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-8 border-l border-neutral-200 pl-0 lg:pl-12"
          >
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">How it works</p>
              <ol className="mt-5 space-y-5 text-sm text-neutral-700">
                <li className="flex gap-4">
                  <span className="font-serif text-2xl text-neutral-950">01</span>
                  <span>Sign up with your name and email — pick a piece if you have one in mind.</span>
                </li>
                <li className="flex gap-4">
                  <span className="font-serif text-2xl text-neutral-950">02</span>
                  <span>Our team prepares restocks in small runs, tracked against the waitlist queue.</span>
                </li>
                <li className="flex gap-4">
                  <span className="font-serif text-2xl text-neutral-950">03</span>
                  <span>You receive a private discount code 24 hours before the public release.</span>
                </li>
              </ol>
            </div>

            <div className="rounded border border-neutral-200 bg-neutral-50 p-6">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Concierge</p>
              <p className="mt-2 text-sm text-neutral-700">
                Questions about sizing, fabric, or international shipping?{' '}
                <Link to={ROUTES.account} className="underline">
                  Reach out via your account
                </Link>{' '}
                — we usually respond within a working day.
              </p>
            </div>
          </motion.aside>
        </div>
      </Container>
    </div>
  )
}
