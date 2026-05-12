import type { CheckoutAddressValues } from '../components/checkout/CheckoutAddressFields'
import type { ShippingAddress, ShippingAddressInput } from '../types'

export function shippingAddressToCheckoutValues(address: ShippingAddress): CheckoutAddressValues {
  return {
    fullName: address.fullName,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    country: address.country,
  }
}

export function checkoutValuesToShippingAddressInput(
  values: CheckoutAddressValues,
  label?: string,
): ShippingAddressInput {
  return {
    label: label?.trim() || undefined,
    fullName: values.fullName.trim(),
    line1: values.line1.trim(),
    line2: values.line2?.trim() || undefined,
    city: values.city.trim(),
    region: values.region.trim(),
    postalCode: values.postalCode.trim(),
    country: values.country.trim(),
  }
}

export function formatShippingAddressSummary(address: ShippingAddress) {
  const lines = [
    address.fullName,
    address.line1,
    address.line2,
    `${address.city}, ${address.region} ${address.postalCode}`,
    address.country,
  ].filter(Boolean)

  return lines.join(' · ')
}

export function getDefaultShippingAddress(addresses: ShippingAddress[]) {
  return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null
}
