import { Link } from 'react-router-dom'
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'

import { ROUTES } from '../../constants'
import type { ShippingAddress } from '../../types'
import { formatShippingAddressSummary, shippingAddressToCheckoutValues } from '../../utils/shippingAddress'

import { CheckoutAddressFields, type CheckoutFormValues } from './CheckoutAddressFields'

type CheckoutShippingSelectorProps = {
  addresses: ShippingAddress[]
  isLoading: boolean
  selectedAddressId: string | null
  useNewAddress: boolean
  register: UseFormRegister<CheckoutFormValues>
  errors: FieldErrors<CheckoutFormValues>
  setValue: UseFormSetValue<CheckoutFormValues>
  onSelectSavedAddress: (addressId: string) => void
  onUseNewAddress: () => void
}

export function CheckoutShippingSelector({
  addresses,
  isLoading,
  selectedAddressId,
  useNewAddress,
  register,
  errors,
  setValue,
  onSelectSavedAddress,
  onUseNewAddress,
}: CheckoutShippingSelectorProps) {
  if (isLoading) {
    return <p className="text-sm text-neutral-600">Loading saved shipping locations…</p>
  }

  if (!addresses.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          Add a shipping location in your profile to reuse it at checkout.
        </p>
        <Link
          to={ROUTES.profile}
          className="inline-block text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 underline-offset-4 hover:underline"
        >
          Manage shipping locations
        </Link>
        <CheckoutAddressFields prefix="shipping" register={register} errors={errors} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {addresses.map((address) => {
          const isSelected = !useNewAddress && selectedAddressId === address.id
          return (
            <label
              key={address.id}
              className={`block cursor-pointer border p-4 transition ${
                isSelected ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 bg-white hover:border-neutral-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="saved-shipping-address"
                  className="mt-1 h-4 w-4 border-neutral-400 text-neutral-900 focus:ring-neutral-900"
                  checked={isSelected}
                  onChange={() => {
                    onSelectSavedAddress(address.id)
                    const values = shippingAddressToCheckoutValues(address)
                    setValue('shipping.fullName', values.fullName)
                    setValue('shipping.line1', values.line1)
                    setValue('shipping.line2', values.line2 ?? '')
                    setValue('shipping.city', values.city)
                    setValue('shipping.region', values.region)
                    setValue('shipping.postalCode', values.postalCode)
                    setValue('shipping.country', values.country)
                  }}
                />
                <div className="min-w-0 flex-1">
                  <CheckoutAddressHeader address={address} />
                  <p className="mt-2 text-sm text-neutral-600">{formatShippingAddressSummary(address)}</p>
                </div>
              </div>
            </label>
          )
        })}
      </div>

      <label className="flex items-center gap-2 text-xs text-neutral-600">
        <input
          type="radio"
          name="saved-shipping-address"
          className="h-4 w-4 border-neutral-400 text-neutral-900 focus:ring-neutral-900"
          checked={useNewAddress}
          onChange={onUseNewAddress}
        />
        Ship to a different address
      </label>

      {useNewAddress ? <CheckoutAddressFields prefix="shipping" register={register} errors={errors} /> : null}

      <Link
        to={ROUTES.profile}
        className="inline-block text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-600 underline-offset-4 hover:text-neutral-950 hover:underline"
      >
        Manage shipping locations
      </Link>
    </div>
  )
}

function CheckoutAddressHeader({ address }: { address: ShippingAddress }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="font-medium text-neutral-950">{address.label || 'Shipping location'}</p>
      {address.isDefault ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Default</span>
      ) : null}
    </div>
  )
}
