import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { ShippingAddress, ShippingAddressInput } from '../types'

type ShippingAddressRow = {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  label: string | null
  full_name: string
  line1: string
  line2: string | null
  city: string
  region: string
  postal_code: string
  country: string
  is_default: boolean
}

function mapRow(row: ShippingAddressRow): ShippingAddress {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    label: row.label,
    fullName: row.full_name,
    line1: row.line1,
    line2: row.line2 ?? undefined,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
    country: row.country,
    isDefault: row.is_default,
  }
}

function toRowPayload(input: ShippingAddressInput) {
  return {
    label: input.label?.trim() || null,
    full_name: input.fullName.trim(),
    line1: input.line1.trim(),
    line2: input.line2?.trim() || null,
    city: input.city.trim(),
    region: input.region.trim(),
    postal_code: input.postalCode.trim(),
    country: input.country.trim(),
    is_default: input.isDefault ?? false,
  }
}

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

async function requireCurrentUserId(client: ReturnType<typeof requireClient>): Promise<string> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error || !user) {
    throw new Error('Sign in to manage shipping addresses.')
  }

  return user.id
}

export async function listShippingAddresses(): Promise<ShippingAddress[]> {
  const client = requireClient()
  const userId = await requireCurrentUserId(client)
  const { data, error } = await client
    .from('user_shipping_addresses')
    .select(
      'id, created_at, updated_at, user_id, label, full_name, line1, line2, city, region, postal_code, country, is_default',
    )
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapRow(row as ShippingAddressRow))
}

export async function createShippingAddress(input: ShippingAddressInput): Promise<ShippingAddress> {
  const client = requireClient()
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError || !user) {
    throw new Error('Sign in to save shipping addresses.')
  }

  const { data, error } = await client
    .from('user_shipping_addresses')
    .insert({
      user_id: user.id,
      ...toRowPayload(input),
    })
    .select(
      'id, created_at, updated_at, user_id, label, full_name, line1, line2, city, region, postal_code, country, is_default',
    )
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to save shipping address.')
  }

  return mapRow(data as ShippingAddressRow)
}

export async function updateShippingAddress(
  id: string,
  input: ShippingAddressInput,
): Promise<ShippingAddress> {
  const client = requireClient()
  const userId = await requireCurrentUserId(client)
  const { data, error } = await client
    .from('user_shipping_addresses')
    .update(toRowPayload(input))
    .eq('id', id)
    .eq('user_id', userId)
    .select(
      'id, created_at, updated_at, user_id, label, full_name, line1, line2, city, region, postal_code, country, is_default',
    )
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to update shipping address.')
  }

  return mapRow(data as ShippingAddressRow)
}

export async function deleteShippingAddress(id: string): Promise<void> {
  const client = requireClient()
  const userId = await requireCurrentUserId(client)
  const { error } = await client.from('user_shipping_addresses').delete().eq('id', id).eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function setDefaultShippingAddress(id: string): Promise<ShippingAddress> {
  const client = requireClient()
  const userId = await requireCurrentUserId(client)
  const { data, error } = await client
    .from('user_shipping_addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select(
      'id, created_at, updated_at, user_id, label, full_name, line1, line2, city, region, postal_code, country, is_default',
    )
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to set default shipping address.')
  }

  return mapRow(data as ShippingAddressRow)
}
