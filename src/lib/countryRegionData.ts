import { allCountries } from 'country-region-data'

export type CountryOption = { name: string; code: string }
export type RegionOption = { name: string; code: string }

const sortedCountries: CountryOption[] = allCountries
  .map(([name, code]) => ({ name, code }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function getCountryOptions(): CountryOption[] {
  return sortedCountries
}

export function findCountryByCode(code: string): CountryOption | null {
  const match = allCountries.find(([, isoCode]) => isoCode === code)
  return match ? { name: match[0], code: match[1] } : null
}

export function findCountryCodeByName(name: string): string | null {
  const match = allCountries.find(([countryName]) => countryName === name)
  return match ? match[1] : null
}

export function getRegionOptions(countryCode: string): RegionOption[] {
  const match = allCountries.find(([, isoCode]) => isoCode === countryCode)
  if (!match) return []
  return match[2].map(([name, code]) => ({ name, code }))
}
