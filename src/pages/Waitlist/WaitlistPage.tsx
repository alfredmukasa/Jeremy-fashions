import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useWaitlistMode } from '../../context/WaitlistModeContext'
import { useProducts } from '../../hooks/useCatalog'
import { joinWaitlist } from '../../services/waitlistService'
import type { Product } from '../../types'

import { BrandLogo } from '../../components/common/BrandLogo'
import { Button } from '../../components/common/Button'
import { Container } from '../../components/layout/Container'
import { FieldLabel, Input } from '../../components/common/Input'
import { cn } from '../../utils/cn'

const phoneRegex = /^[+()0-9 \-.]{7,}$/

const waitlistSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Please enter your full name.'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
    includePhone: z.boolean(),
    phone: z.string().optional(),
    instagram: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || v.length <= 80, 'Keep Instagram handles under 80 characters.'),
    interestedProductId: z.string().optional(),
    notes: z.string().max(280, 'Keep notes under 280 characters.').optional(),
  })
  .superRefine((vals, ctx) => {
    if (!vals.includePhone) return
    const p = vals.phone?.trim() ?? ''
    if (!p) return
    if (!phoneRegex.test(p)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid phone number.', path: ['phone'] })
    }
  })

type WaitlistFormValues = z.infer<typeof waitlistSchema>

const HERO_IMAGE =
  'https://images.unsplash.com/photo-149048165187-aeb9228c966e?auto=format&fit=crop&w=2000&q=80'

function FieldError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null
  return <p className={cn('mt-2 text-xs', className ?? 'text-rose-600 dark:text-rose-400')}>{message}</p>
}

function WaitlistProductFields({
  presetSlug,
  register,
  errors,
  control,
  setValue,
}: {
  presetSlug: string
  register: ReturnType<typeof useForm<WaitlistFormValues>>['register']
  errors: ReturnType<typeof useForm<WaitlistFormValues>>['formState']['errors']
  control: ReturnType<typeof useForm<WaitlistFormValues>>['control']
  setValue: ReturnType<typeof useForm<WaitlistFormValues>>['setValue']
}) {
  const { data: products } = useProducts()
  const productOptions = useMemo(() => products ?? [], [products])
  const watchedProductId = useWatch({ control, name: 'interestedProductId' })
  const watchedProduct = useMemo(
    () => productOptions.find((p: Product) => p.id === watchedProductId),
    [productOptions, watchedProductId],
  )

  const presetProduct = useMemo(
    () => productOptions.find((p: Product) => p.slug === presetSlug),
    [productOptions, presetSlug],
  )

  useEffect(() => {
    if (presetProduct) {
      setValue('interestedProductId', presetProduct.id)
    }
  }, [presetProduct, setValue])

  return (
    <>
      <div>
        <FieldLabel id="interestedProductId">Interested piece</FieldLabel>
        <select
          id="interestedProductId"
          {...register('interestedProductId')}
          className={cn(
            'w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none dark:border-[var(--border-subtle)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)]',
            'transition focus:border-neutral-900 dark:focus:border-white/40',
          )}
        >
          <option value="">No preference — notify me of any drop</option>
          {productOptions.map((p: Product) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {watchedProduct ? (
          <p className="mt-2 text-xs text-neutral-500 dark:text-[var(--text-muted)]">
            We&rsquo;ll prioritise restock alerts for {watchedProduct.name}.
          </p>
        ) : null}
        <FieldError message={errors.interestedProductId?.message} />
      </div>

      <div>
        <FieldLabel id="notes">Notes (optional)</FieldLabel>
        <textarea
          id="notes"
          rows={3}
          placeholder="Sizing, colour preference, shipping window…"
          className={cn(
            'w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none dark:border-[var(--border-subtle)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)]',
            'transition placeholder:text-neutral-400 focus:border-neutral-900 dark:placeholder:text-[var(--text-muted)] dark:focus:border-white/40',
          )}
          {...register('notes')}
        />
        <FieldError message={errors.notes?.message} />
      </div>
    </>
  )
}

export default function WaitlistPage() {
  const [searchParams] = useSearchParams()
  const presetSlug = searchParams.get('product') ?? ''
  const { waitlistMode } = useWaitlistMode()
  const [showSuccess, setShowSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      fullName: '',
      email: '',
      includePhone: false,
      phone: '',
      instagram: '',
      interestedProductId: '',
      notes: '',
    },
  })

  const includePhone = useWatch({ control, name: 'includePhone' })

  useEffect(() => {
    document.title = waitlistMode ? 'Private access — Jeremy Atelier' : 'Waitlist — Jeremy Atelier'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        'content',
        'Join the Jeremy Atelier waitlist for early access to the next collection, private restocks, and member-only releases.',
      )
    }
  }, [waitlistMode])

  async function onSubmit(values: WaitlistFormValues) {
    setShowSuccess(false)
    const result = await joinWaitlist({
      fullName: values.fullName,
      email: values.email,
      phone: values.includePhone ? values.phone?.trim() || undefined : undefined,
      instagram: values.instagram?.trim() || undefined,
      interestedProductId: waitlistMode ? undefined : values.interestedProductId || undefined,
    })

    if (result.ok) {
      toast.success('You\'re on the list — welcome to the inner circle.')
      setShowSuccess(true)
      reset({
        fullName: '',
        email: '',
        includePhone: false,
        phone: '',
        instagram: '',
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

  const isLuxuryShell = waitlistMode

  if (!isLuxuryShell) {
    return (
      <div className="pb-24">
        <div className="border-b border-neutral-200 bg-neutral-50 dark:border-[var(--border-subtle)] dark:bg-[var(--surface-muted)]">
          <Container className="py-16 md:py-20">
            <div className="max-w-2xl">
              <BrandLogo variant="dark" size="md" showWordmark className="mb-6" />
              <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-[var(--text-muted)]">Waitlist</p>
              <h1 className="mt-4 font-serif text-4xl tracking-[0.04em] text-neutral-950 dark:text-[var(--text-primary)] md:text-5xl">
                Reserve early access.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-[var(--text-secondary)] md:text-base">
                Tell us which piece you have your eye on. Members receive a private note when restocks land.
              </p>
            </div>
          </Container>
        </div>

        <Container className="py-12 md:py-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-start">
            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="space-y-6"
              noValidate
            >
              <div>
                <FieldLabel id="fullName">Full name</FieldLabel>
                <Input id="fullName" autoComplete="name" placeholder="Maya Lin" aria-invalid={Boolean(errors.fullName)} {...register('fullName')} />
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel id="phone">Phone</FieldLabel>
                    <label className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-neutral-900" {...register('includePhone')} />
                      Include
                    </label>
                  </div>
                  {includePhone ? (
                    <Input id="phone" type="tel" autoComplete="tel" placeholder="+1 555 0123" aria-invalid={Boolean(errors.phone)} {...register('phone')} />
                  ) : (
                    <p className="text-xs text-neutral-500">Optional — enable if you want SMS concierge updates.</p>
                  )}
                  <FieldError message={errors.phone?.message} />
                </div>
              </div>

              <div>
                <FieldLabel id="instagram">Instagram (optional)</FieldLabel>
                <Input id="instagram" placeholder="@jeremyatelier" aria-invalid={Boolean(errors.instagram)} {...register('instagram')} />
                <FieldError message={errors.instagram?.message} />
              </div>

              <WaitlistProductFields
                presetSlug={presetSlug}
                register={register}
                errors={errors}
                control={control}
                setValue={setValue}
              />

              <div className="flex flex-col items-start gap-3 pt-2 sm:flex-row sm:items-center">
                <Button type="submit" className={cn('min-w-[220px]', isSubmitting && 'pointer-events-none opacity-70')}>
                  {isSubmitting ? 'Submitting…' : 'Join the waitlist'}
                </Button>
                <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">We never share your details.</p>
              </div>

              <AnimatePresence>
                {showSuccess ? (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs text-emerald-700 dark:text-emerald-400"
                  >
                    You&rsquo;re confirmed. Watch your inbox — invitations send in quiet waves.
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </motion.form>

            <motion.aside
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="space-y-8 border-l border-neutral-200 pl-0 dark:border-[var(--border-subtle)] lg:pl-12"
            >
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">How it works</p>
                <ol className="mt-5 space-y-5 text-sm text-neutral-700 dark:text-[var(--text-secondary)]">
                  <li className="flex gap-4">
                    <span className="font-serif text-2xl text-neutral-950 dark:text-[var(--text-primary)]">01</span>
                    <span>Share your name and email — add a piece if something already speaks to you.</span>
                  </li>
                  <li className="flex gap-4">
                    <span className="font-serif text-2xl text-neutral-950 dark:text-[var(--text-primary)]">02</span>
                    <span>We cut runs intentionally small, sequenced against the waitlist queue.</span>
                  </li>
                  <li className="flex gap-4">
                    <span className="font-serif text-2xl text-neutral-950 dark:text-[var(--text-primary)]">03</span>
                    <span>You receive a private window before the public release.</span>
                  </li>
                </ol>
              </div>

              <div className="rounded border border-neutral-200 bg-neutral-50 p-6 dark:border-[var(--border-subtle)] dark:bg-[var(--surface-muted)]">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Concierge</p>
                <p className="mt-2 text-sm text-neutral-700 dark:text-[var(--text-secondary)]">
                  Questions about sizing or international delivery?{' '}
                  <Link to={ROUTES.account} className="underline">
                    Reach out via your account
                  </Link>
                  .
                </p>
              </div>
            </motion.aside>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="relative -mt-[calc(var(--header-offset)+var(--announcement-height)+1.25rem)] overflow-hidden bg-neutral-950 text-white lg:-mt-[calc(var(--header-offset)+var(--announcement-height))]">
      <div className="absolute inset-0">
        <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover opacity-55" loading="eager" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/92" />
      </div>

      <section className="relative px-4 pb-20 pt-32 sm:px-6 sm:pb-24 sm:pt-36 lg:px-12 lg:pb-28 lg:pt-40">
        <Container className="relative max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <BrandLogo variant="light" size="md" showWordmark className="opacity-90" />
            <h1 className="mt-5 font-serif text-[clamp(2.4rem,6vw,4.25rem)] leading-[1.02] tracking-[0.02em]">
              New silhouettes are returning — quietly, and by invitation.
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
              A private list for those who prefer precision over noise. Join to receive early access, intimate restock
              notes, and the occasional editorial preview.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8"
            >
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
                <span className="rounded-full border border-white/15 px-3 py-1">Limited access</span>
                <span className="rounded-full border border-white/15 px-3 py-1">Members first</span>
                <span className="rounded-full border border-white/15 px-3 py-1">Exclusive restock alerts</span>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="fullName" className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    autoComplete="name"
                    {...register('fullName')}
                    className="mt-2 w-full border-b border-white/25 bg-transparent py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white"
                    placeholder="Alexandre Laurent"
                  />
                  <FieldError message={errors.fullName?.message} className="text-rose-300" />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register('email')}
                      className="mt-2 w-full border-b border-white/25 bg-transparent py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white"
                      placeholder="you@studio.com"
                    />
                    <FieldError message={errors.email?.message} className="text-rose-300" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="instagram" className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
                        Instagram
                      </label>
                      <span className="text-[9px] uppercase tracking-[0.22em] text-white/35">Optional</span>
                    </div>
                    <input
                      id="instagram"
                      {...register('instagram')}
                      className="mt-2 w-full border-b border-white/25 bg-transparent py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white"
                      placeholder="@yourhandle"
                    />
                    <FieldError message={errors.instagram?.message} className="text-rose-300" />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                  <label className="flex cursor-pointer items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">Phone</p>
                      <p className="mt-1 text-xs text-white/45">Optional — enable for SMS drop invitations.</p>
                    </div>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-white"
                      aria-label="Include phone number"
                      {...register('includePhone')}
                    />
                  </label>
                  <AnimatePresence>
                    {includePhone ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          id="phone"
                          type="tel"
                          autoComplete="tel"
                          {...register('phone')}
                          className="mt-4 w-full border-b border-white/25 bg-transparent py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white"
                          placeholder="+1 555 0123"
                        />
                        <FieldError message={errors.phone?.message} className="text-rose-300" />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'group relative w-full overflow-hidden border border-white/25 bg-white px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-950 transition',
                    'hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-60',
                  )}
                >
                  <span className="relative z-[1]">{isSubmitting ? 'Submitting…' : 'Request access'}</span>
                  <span className="pointer-events-none absolute inset-0 translate-y-full bg-neutral-200 transition duration-500 group-hover:translate-y-0" />
                </motion.button>

                <p className="text-center text-[10px] uppercase tracking-[0.26em] text-white/40">Private list · No spam · Unsubscribe anytime</p>

                <AnimatePresence>
                  {showSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-100"
                    >
                      You&rsquo;re in. Keep an eye on your inbox — the first wave is intentionally small.
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-10"
            >
              <div className="space-y-4 border-l border-white/10 pl-6">
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/45">Social proof</p>
                <figure className="space-y-3">
                  <blockquote className="font-serif text-2xl leading-snug text-white/90">
                    &ldquo;The quietest drop I&rsquo;ve waited for — and the only one that felt personal.&rdquo;
                  </blockquote>
                  <figcaption className="text-xs uppercase tracking-[0.24em] text-white/45">Milan · charter member</figcaption>
                </figure>
                <figure className="space-y-3 pt-4">
                  <blockquote className="text-sm leading-relaxed text-white/70">
                    &ldquo;Feels closer to a studio appointment than ecommerce. The pieces arrive with intention.&rdquo;
                  </blockquote>
                  <figcaption className="text-xs uppercase tracking-[0.24em] text-white/45">New York · editorial client</figcaption>
                </figure>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/45">Stay close</p>
                <p className="mt-3 text-sm text-white/65">
                  Follow the atelier for process films, fabric studies, and campaign previews between drops.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center border border-white/20 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.24em] text-white transition hover:border-white hover:bg-white/10"
                  >
                    Instagram
                  </a>
                  <a
                    href="mailto:support@jeremyatelier.com"
                    className="inline-flex items-center justify-center border border-white/20 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.24em] text-white transition hover:border-white hover:bg-white/10"
                  >
                    Concierge
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>
    </div>
  )
}
