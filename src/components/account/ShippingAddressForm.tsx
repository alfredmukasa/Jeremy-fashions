import type { FieldErrors, UseFormRegister } from 'react-hook-form'

import { FieldLabel, Input } from '../common/Input'

export type ShippingAddressFormValues = {
  label?: string
  fullName: string
  line1: string
  line2?: string
  city: string
  region: string
  postalCode: string
  country: string
  isDefault: boolean
}

type ShippingAddressFormProps = {
  register: UseFormRegister<ShippingAddressFormValues>
  errors: FieldErrors<ShippingAddressFormValues>
  showDefaultToggle?: boolean
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-2 text-xs text-rose-600">{message}</p>
}

export function ShippingAddressForm({
  register,
  errors,
  showDefaultToggle = true,
}: ShippingAddressFormProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FieldLabel id="address-label">Label (optional)</FieldLabel>
        <Input id="address-label" placeholder="Home, office, studio" {...register('label')} />
        <FieldError message={errors.label?.message} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel id="address-fullName">Full name</FieldLabel>
        <Input id="address-fullName" autoComplete="name" {...register('fullName')} />
        <FieldError message={errors.fullName?.message} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel id="address-line1">Address</FieldLabel>
        <Input id="address-line1" autoComplete="address-line1" {...register('line1')} />
        <FieldError message={errors.line1?.message} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel id="address-line2">Apartment, suite, etc. (optional)</FieldLabel>
        <Input id="address-line2" autoComplete="address-line2" {...register('line2')} />
      </div>
      <div>
        <FieldLabel id="address-city">City</FieldLabel>
        <Input id="address-city" autoComplete="address-level2" {...register('city')} />
        <FieldError message={errors.city?.message} />
      </div>
      <div>
        <FieldLabel id="address-region">State / Region</FieldLabel>
        <Input id="address-region" autoComplete="address-level1" {...register('region')} />
        <FieldError message={errors.region?.message} />
      </div>
      <div>
        <FieldLabel id="address-postalCode">Postal code</FieldLabel>
        <Input id="address-postalCode" autoComplete="postal-code" {...register('postalCode')} />
        <FieldError message={errors.postalCode?.message} />
      </div>
      <div>
        <FieldLabel id="address-country">Country</FieldLabel>
        <Input
          id="address-country"
          autoComplete="country-name"
          placeholder="United States"
          {...register('country')}
        />
        <FieldError message={errors.country?.message} />
      </div>
      {showDefaultToggle ? (
        <label className="sm:col-span-2 flex items-center gap-2 text-xs text-neutral-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded-none border-neutral-400 text-neutral-900 focus:ring-neutral-900"
            {...register('isDefault')}
          />
          Set as default shipping location
        </label>
      ) : null}
    </div>
  )
}
