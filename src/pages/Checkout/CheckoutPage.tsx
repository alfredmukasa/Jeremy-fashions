import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Elements } from '@stripe/react-stripe-js'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { createPaymentIntent, PaymentApiError } from '../../lib/paymentApi'
import { getStripe, isStripeConfigured } from '../../lib/stripe'
import { useProducts } from '../../hooks/useCatalog'
import { listShippingAddresses } from '../../services/shippingAddressService'
import { useCartStore } from '../../store/cartStore'
import { calculateCheckoutTotals } from '../../utils/checkoutTotals'
import type { ShippingAddress } from '../../types'
import { getDefaultShippingAddress, shippingAddressToCheckoutValues } from '../../utils/shippingAddress'

import { CheckoutAddressFields, type CheckoutFormValues } from '../../components/checkout/CheckoutAddressFields'
import { CheckoutShippingSelector } from '../../components/checkout/CheckoutShippingSelector'
import { CheckoutCartSummary } from '../../components/checkout/CheckoutCartSummary'
import { CheckoutConfirmation } from '../../components/checkout/CheckoutConfirmation'
import { CheckoutTestCards } from '../../components/checkout/CheckoutTestCards'
import { StripePaymentForm } from '../../components/checkout/StripePaymentForm'
import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import { Container } from '../../components/layout/Container'

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the full name for this address.'),
  line1: z.string().trim().min(3, 'Enter a street address.'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'Enter a city.'),
  region: z.string().trim().min(2, 'Enter a state or region.'),
  postalCode: z.string().trim().min(3, 'Enter a postal code.'),
  country: z.string().trim().min(2, 'Enter a country.'),
})

const checkoutSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
    shipping: addressSchema,
    billing: z.object({
      fullName: z.string().optional(),
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }),
    billingSameAsShipping: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.billingSameAsShipping) return

    const parsed = addressSchema.safeParse(value.billing)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          ...issue,
          path: ['billing', ...(issue.path ?? [])],
        })
      }
    }
  })

type CheckoutStep = 'details' | 'payment' | 'confirmation'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-2 text-xs text-rose-600">{message}</p>
}

export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines)
  const clearCart = useCartStore((s) => s.clear)
  const reconcileCatalogPrices = useCartStore((s) => s.reconcileCatalogPrices)
  const subtotal = useCartStore((s) => s.subtotal())
  const { user, session } = useAuth()
  const { data: products } = useProducts()
  const shippingAddressesQuery = useQuery({
    queryKey: ['customer', 'shipping-addresses', user?.id],
    queryFn: listShippingAddresses,
    enabled: Boolean(user?.id),
  })
  const [searchParams, setSearchParams] = useSearchParams()

  const totals = useMemo(() => calculateCheckoutTotals(subtotal), [subtotal])
  const stripePromise = useMemo(() => getStripe(), [])

  const [step, setStep] = useState<CheckoutStep>('details')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [isPreparingPayment, setIsPreparingPayment] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [useNewAddress, setUseNewAddress] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email ?? '',
      shipping: {
        fullName: '',
        line1: '',
        line2: '',
        city: '',
        region: '',
        postalCode: '',
        country: 'United States',
      },
      billing: {
        fullName: '',
        line1: '',
        line2: '',
        city: '',
        region: '',
        postalCode: '',
        country: 'United States',
      },
      billingSameAsShipping: true,
    },
  })

  const billingSameAsShipping = watch('billingSameAsShipping')
  const email = watch('email')

  useEffect(() => {
    if (user?.email) {
      setValue('email', user.email)
    }
  }, [setValue, user?.email])

  useEffect(() => {
    if (!products?.length) return
    reconcileCatalogPrices(products)
  }, [products, reconcileCatalogPrices])

  useEffect(() => {
    const addresses = shippingAddressesQuery.data
    if (!addresses?.length || selectedAddressId || useNewAddress) return

    const defaultAddress = getDefaultShippingAddress(addresses)
    if (!defaultAddress) return

    setSelectedAddressId(defaultAddress.id)
    const values = shippingAddressToCheckoutValues(defaultAddress)
    setValue('shipping.fullName', values.fullName)
    setValue('shipping.line1', values.line1)
    setValue('shipping.line2', values.line2 ?? '')
    setValue('shipping.city', values.city)
    setValue('shipping.region', values.region)
    setValue('shipping.postalCode', values.postalCode)
    setValue('shipping.country', values.country)
  }, [selectedAddressId, setValue, shippingAddressesQuery.data, useNewAddress])

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent')
    const redirectStatus = searchParams.get('redirect_status')
    if (!paymentIntentId || redirectStatus !== 'succeeded') return

    const storedOrderId = sessionStorage.getItem('jeremy-checkout-order-id')
    clearCart()
    setOrderId(storedOrderId ?? paymentIntentId)
    setStep('confirmation')
    sessionStorage.removeItem('jeremy-checkout-order-id')
    setSearchParams({}, { replace: true })
  }, [clearCart, searchParams, setSearchParams])

  if (step === 'confirmation' && orderId) {
    return <CheckoutConfirmation orderId={orderId} total={totals.total} email={email || user?.email || ''} />
  }

  if (lines.length === 0) {
    return (
      <Container className="py-24 text-center">
        <h1 className="font-serif text-3xl text-neutral-950">Your bag is empty</h1>
        <Link to={ROUTES.shop}>
          <Button className="mt-8">Shop products</Button>
        </Link>
      </Container>
    )
  }

  async function startPayment(values: CheckoutFormValues) {
    if (!session?.access_token) {
      toast.error('Sign in again to complete checkout.')
      return
    }

    if (!isStripeConfigured) {
      setCheckoutError('Stripe publishable key is not configured.')
      return
    }

    setCheckoutError(null)
    setIsPreparingPayment(true)

    try {
      const response = await createPaymentIntent(
        {
          idempotencyKey,
          email: values.email,
          items: lines.map((line) => ({
            productId: line.productId,
            title: line.snapshot.name,
            quantity: line.quantity,
            unitPrice: line.snapshot.unitPrice,
            size: line.size,
            colorName: line.colorName,
          })),
          shippingAddress: values.shipping,
          billingAddress: values.billingSameAsShipping
            ? values.shipping
            : {
                fullName: values.billing.fullName ?? '',
                line1: values.billing.line1 ?? '',
                line2: values.billing.line2,
                city: values.billing.city ?? '',
                region: values.billing.region ?? '',
                postalCode: values.billing.postalCode ?? '',
                country: values.billing.country ?? '',
              },
          billingSameAsShipping: values.billingSameAsShipping,
        },
        session.access_token,
      )

      setClientSecret(response.clientSecret)
      setOrderId(response.orderId)
      sessionStorage.setItem('jeremy-checkout-order-id', response.orderId)
      setStep('payment')
    } catch (error) {
      const message =
        error instanceof PaymentApiError
          ? error.message
          : 'Unable to start checkout. Please try again.'
      setCheckoutError(message)
      toast.error(message)
    } finally {
      setIsPreparingPayment(false)
    }
  }

  function handlePaymentSuccess() {
    clearCart()
    sessionStorage.removeItem('jeremy-checkout-order-id')
    setStep('confirmation')
    toast.success('Payment received. Thank you for your order.')
  }

  function handlePaymentError(message: string) {
    setCheckoutError(message)
    toast.error(message)
  }

  const returnUrl = `${window.location.origin}${ROUTES.checkout}?status=return`

  return (
    <div className="pb-24">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-14 md:py-16">
          <h1 className="font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl">Checkout</h1>
          <p className="mt-3 max-w-2xl text-sm text-neutral-600">
            Secure Stripe test-mode checkout with shipping, billing, and card payment.
          </p>
        </Container>
      </div>

      <Container className="py-12 md:py-16">
        <CheckoutGrid
          step={step}
          lines={lines}
          totals={totals}
          isPreparingPayment={isPreparingPayment}
          checkoutError={checkoutError}
          billingSameAsShipping={billingSameAsShipping}
          register={register}
          errors={errors}
          setValue={setValue}
          handleSubmit={handleSubmit}
          startPayment={startPayment}
          stripePromise={stripePromise}
          clientSecret={clientSecret}
          orderId={orderId}
          returnUrl={returnUrl}
          shippingAddresses={shippingAddressesQuery.data ?? []}
          shippingAddressesLoading={shippingAddressesQuery.isLoading}
          selectedAddressId={selectedAddressId}
          useNewAddress={useNewAddress}
          onSelectSavedAddress={(addressId) => {
            setSelectedAddressId(addressId)
            setUseNewAddress(false)
          }}
          onUseNewAddress={() => {
            setUseNewAddress(true)
            setSelectedAddressId(null)
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </Container>
    </div>
  )
}

function CheckoutGrid(props: {
  step: CheckoutStep
  lines: ReturnType<typeof useCartStore.getState>['lines']
  totals: ReturnType<typeof calculateCheckoutTotals>
  isPreparingPayment: boolean
  checkoutError: string | null
  billingSameAsShipping: boolean
  register: ReturnType<typeof useForm<CheckoutFormValues>>['register']
  errors: ReturnType<typeof useForm<CheckoutFormValues>>['formState']['errors']
  setValue: ReturnType<typeof useForm<CheckoutFormValues>>['setValue']
  handleSubmit: ReturnType<typeof useForm<CheckoutFormValues>>['handleSubmit']
  startPayment: (values: CheckoutFormValues) => Promise<void>
  stripePromise: ReturnType<typeof getStripe>
  clientSecret: string | null
  orderId: string | null
  returnUrl: string
  shippingAddresses: ShippingAddress[]
  shippingAddressesLoading: boolean
  selectedAddressId: string | null
  useNewAddress: boolean
  onSelectSavedAddress: (addressId: string) => void
  onUseNewAddress: () => void
  onPaymentSuccess: () => void
  onPaymentError: (message: string) => void
}) {
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
      <div className="space-y-12">
        {props.step === 'details' ? (
          <form className="space-y-12" onSubmit={props.handleSubmit(props.startPayment)} noValidate>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-900">Contact</h2>
              <div className="mt-6 max-w-xl">
                <FieldLabel id="email">Email</FieldLabel>
                <Input id="email" type="email" autoComplete="email" readOnly {...props.register('email')} />
                <FieldError message={props.errors.email?.message} />
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-900">Shipping</h2>
              <div className="mt-6">
                <CheckoutShippingSelector
                  addresses={props.shippingAddresses}
                  isLoading={props.shippingAddressesLoading}
                  selectedAddressId={props.selectedAddressId}
                  useNewAddress={props.useNewAddress}
                  register={props.register}
                  errors={props.errors}
                  setValue={props.setValue}
                  onSelectSavedAddress={props.onSelectSavedAddress}
                  onUseNewAddress={props.onUseNewAddress}
                />
              </div>
            </section>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-900">Billing</h2>
                <label className="flex items-center gap-2 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded-none border-neutral-400 text-neutral-900 focus:ring-neutral-900"
                    checked={props.billingSameAsShipping}
                    onChange={(event) => props.setValue('billingSameAsShipping', event.target.checked)}
                  />
                  Same as shipping
                </label>
              </div>
              {!props.billingSameAsShipping ? (
                <div className="mt-6">
                  <CheckoutAddressFields prefix="billing" register={props.register} errors={props.errors} />
                </div>
              ) : (
                <p className="mt-3 text-xs text-neutral-500">Billing will match your shipping address.</p>
              )}
            </section>

            <CheckoutTestCards />

            {props.checkoutError ? (
              <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{props.checkoutError}</p>
            ) : null}

            <div className="lg:hidden">
              <CheckoutCartSummary
                lines={props.lines}
                totals={props.totals}
                isSubmitting={props.isPreparingPayment}
                submitLabel="Continue to payment"
              />
            </div>

            <CheckoutDesktopSubmit isPreparingPayment={props.isPreparingPayment} />
          </form>
        ) : null}

        {props.step === 'payment' && props.clientSecret ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-900">Payment</h2>
              <p className="mt-3 text-sm text-neutral-600">
                Order {props.orderId?.slice(0, 8).toUpperCase()} · Stripe secure card entry
              </p>
            </div>
            <Elements stripe={props.stripePromise} options={{ clientSecret: props.clientSecret }}>
              <StripePaymentForm
                returnUrl={props.returnUrl}
                onSuccess={props.onPaymentSuccess}
                onError={props.onPaymentError}
              />
            </Elements>
            <CheckoutTestCards />
            {props.checkoutError ? (
              <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{props.checkoutError}</p>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="hidden lg:block">
        <CheckoutCartSummary
          lines={props.lines}
          totals={props.totals}
          isSubmitting={props.isPreparingPayment}
          showSubmit={props.step === 'details'}
          submitLabel="Continue to payment"
        />
      </div>
    </div>
  )
}

function CheckoutDesktopSubmit({ isPreparingPayment }: { isPreparingPayment: boolean }) {
  return (
    <div className="hidden lg:block">
      <Button type="submit" disabled={isPreparingPayment}>
        {isPreparingPayment ? 'Preparing payment…' : 'Continue to payment'}
      </Button>
    </div>
  )
}
