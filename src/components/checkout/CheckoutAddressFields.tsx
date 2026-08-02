import { useMemo } from 'react'
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'

import { findCountryCodeByName, getCountryOptions, getRegionOptions } from '../../lib/countryRegionData'
import { cn } from '../../utils/cn'
import { FieldLabel, Input } from '../common/Input'

export type CheckoutAddressValues = {
  fullName: string
  line1: string
  line2?: string
  city: string
  region: string
  postalCode: string
  country: string
}

type CheckoutAddressFieldsProps = {
  prefix: 'shipping' | 'billing'
  register: UseFormRegister<CheckoutFormValues>
  errors: FieldErrors<CheckoutFormValues>
  watch: UseFormWatch<CheckoutFormValues>
  setValue: UseFormSetValue<CheckoutFormValues>
}

export type CheckoutFormValues = {
  email: string
  shipping: CheckoutAddressValues
  billing: Partial<CheckoutAddressValues>
  billingSameAsShipping: boolean
}

const selectClassName = cn(
  'w-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-strong)]',
)

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-2 text-xs text-rose-600">{message}</p>
}

export function CheckoutAddressFields({ prefix, register, errors, watch, setValue }: CheckoutAddressFieldsProps) {
  const fieldErrors = errors[prefix]
  const countryOptions = useMemo(() => getCountryOptions(), [])
  const countryName = watch(`${prefix}.country`)
  const countryCode = useMemo(() => findCountryCodeByName(countryName ?? ''), [countryName])
  const regionOptions = useMemo(() => (countryCode ? getRegionOptions(countryCode) : []), [countryCode])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FieldLabel id={`${prefix}-fullName`}>Full name</FieldLabel>
        <Input
          id={`${prefix}-fullName`}
          autoComplete={prefix === 'shipping' ? 'name' : 'billing name'}
          {...register(`${prefix}.fullName`)}
        />
        <FieldError message={fieldErrors?.fullName?.message} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel id={`${prefix}-line1`}>Address</FieldLabel>
        <Input
          id={`${prefix}-line1`}
          autoComplete={prefix === 'shipping' ? 'address-line1' : 'billing address-line1'}
          {...register(`${prefix}.line1`)}
        />
        <FieldError message={fieldErrors?.line1?.message} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel id={`${prefix}-line2`}>Apartment, suite, etc. (optional)</FieldLabel>
        <Input
          id={`${prefix}-line2`}
          autoComplete={prefix === 'shipping' ? 'address-line2' : 'billing address-line2'}
          {...register(`${prefix}.line2`)}
        />
      </div>
      <div>
        <FieldLabel id={`${prefix}-city`}>City</FieldLabel>
        <Input
          id={`${prefix}-city`}
          autoComplete={prefix === 'shipping' ? 'address-level2' : 'billing address-level2'}
          {...register(`${prefix}.city`)}
        />
        <FieldError message={fieldErrors?.city?.message} />
      </div>
      <div>
        <FieldLabel id={`${prefix}-country`}>Country</FieldLabel>
        <select
          id={`${prefix}-country`}
          className={selectClassName}
          autoComplete={prefix === 'shipping' ? 'country-name' : 'billing country-name'}
          {...register(`${prefix}.country`, {
            onChange: () => setValue(`${prefix}.region`, ''),
          })}
        >
          <option value="">Select country</option>
          {countryOptions.map((country) => (
            <option key={country.code} value={country.name}>
              {country.name}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors?.country?.message} />
      </div>
      <div>
        <FieldLabel id={`${prefix}-region`}>State / Province</FieldLabel>
        {regionOptions.length > 0 ? (
          <select
            id={`${prefix}-region`}
            className={selectClassName}
            autoComplete={prefix === 'shipping' ? 'address-level1' : 'billing address-level1'}
            {...register(`${prefix}.region`)}
          >
            <option value="">Select state / province</option>
            {regionOptions.map((region) => (
              <option key={region.code} value={region.name}>
                {region.name}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={`${prefix}-region`}
            autoComplete={prefix === 'shipping' ? 'address-level1' : 'billing address-level1'}
            {...register(`${prefix}.region`)}
          />
        )}
        <FieldError message={fieldErrors?.region?.message} />
      </div>
      <div>
        <FieldLabel id={`${prefix}-postalCode`}>Postal code</FieldLabel>
        <Input
          id={`${prefix}-postalCode`}
          autoComplete={prefix === 'shipping' ? 'postal-code' : 'billing postal-code'}
          {...register(`${prefix}.postalCode`)}
        />
        <FieldError message={fieldErrors?.postalCode?.message} />
      </div>
    </div>
  )
}
