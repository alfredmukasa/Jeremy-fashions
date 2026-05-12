import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { useAuth } from '../../context/AuthContext'
import type { ShippingAddress } from '../../types'
import { formatShippingAddressSummary } from '../../utils/shippingAddress'
import {
  createShippingAddress,
  deleteShippingAddress,
  listShippingAddresses,
  setDefaultShippingAddress,
  updateShippingAddress,
} from '../../services/shippingAddressService'

import { Button } from '../common/Button'
import { ShippingAddressForm, type ShippingAddressFormValues } from './ShippingAddressForm'

const addressSchema = z.object({
  label: z.string().trim().max(40, 'Keep labels under 40 characters.').optional().or(z.literal('')),
  fullName: z.string().trim().min(2, 'Enter the full name for this address.'),
  line1: z.string().trim().min(3, 'Enter a street address.'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'Enter a city.'),
  region: z.string().trim().min(2, 'Enter a state or region.'),
  postalCode: z.string().trim().min(3, 'Enter a postal code.'),
  country: z.string().trim().min(2, 'Enter a country.'),
  isDefault: z.boolean(),
})

function toFormValues(address?: ShippingAddress): ShippingAddressFormValues {
  return {
    label: address?.label ?? '',
    fullName: address?.fullName ?? '',
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    region: address?.region ?? '',
    postalCode: address?.postalCode ?? '',
    country: address?.country ?? 'United States',
    isDefault: address?.isDefault ?? false,
  }
}

export function ShippingAddressManager() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const addressesQuery = useQuery({
    queryKey: ['customer', 'shipping-addresses', user?.id],
    queryFn: listShippingAddresses,
    enabled: Boolean(user?.id),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: user?.id ? ['customer', 'shipping-addresses', user.id] : ['customer', 'shipping-addresses'],
    })
  }

  const createMutation = useMutation({
    mutationFn: createShippingAddress,
    onSuccess: () => {
      toast.success('Shipping location saved.')
      setIsCreating(false)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ShippingAddressFormValues }) =>
      updateShippingAddress(id, {
        label: values.label,
        fullName: values.fullName,
        line1: values.line1,
        line2: values.line2,
        city: values.city,
        region: values.region,
        postalCode: values.postalCode,
        country: values.country,
        isDefault: values.isDefault,
      }),
    onSuccess: () => {
      toast.success('Shipping location updated.')
      setEditingId(null)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const defaultMutation = useMutation({
    mutationFn: setDefaultShippingAddress,
    onSuccess: () => {
      toast.success('Default shipping location updated.')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteShippingAddress,
    onSuccess: () => {
      toast.success('Shipping location removed.')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (addressesQuery.isLoading) {
    return <p className="text-sm text-neutral-600">Loading shipping locations…</p>
  }

  if (addressesQuery.isError) {
    return (
      <div className="border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Unable to load shipping locations right now.
      </div>
    )
  }

  const addresses = addressesQuery.data ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Shipping locations</p>
          <p className="mt-2 text-sm text-neutral-600">
            Save multiple delivery addresses and keep one default for faster checkout.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEditingId(null)
            setIsCreating((current) => !current)
          }}
        >
          {isCreating ? 'Cancel' : 'Add location'}
        </Button>
      </div>

      {isCreating ? (
        <AddressEditor
          title="New shipping location"
          submitLabel="Save location"
          initialValues={toFormValues()}
          isSubmitting={createMutation.isPending}
          onCancel={() => setIsCreating(false)}
          onSubmit={(values) => createMutation.mutate({
            label: values.label,
            fullName: values.fullName,
            line1: values.line1,
            line2: values.line2,
            city: values.city,
            region: values.region,
            postalCode: values.postalCode,
            country: values.country,
            isDefault: values.isDefault,
          })}
        />
      ) : null}

      {addresses.length ? (
        <ul className="space-y-4">
          {addresses.map((address) => (
            <li key={address.id} className="border border-neutral-200 bg-white p-6">
              {editingId === address.id ? (
                <AddressEditor
                  title="Edit shipping location"
                  submitLabel="Update location"
                  initialValues={toFormValues(address)}
                  isSubmitting={updateMutation.isPending}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(values) => updateMutation.mutate({ id: address.id, values })}
                />
              ) : (
                <AddressCard
                  address={address}
                  onEdit={() => {
                    setIsCreating(false)
                    setEditingId(address.id)
                  }}
                  onDelete={() => deleteMutation.mutate(address.id)}
                  onSetDefault={() => defaultMutation.mutate(address.id)}
                  isDeleting={deleteMutation.isPending}
                  isSettingDefault={defaultMutation.isPending}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="border border-dashed border-neutral-300 bg-neutral-50 p-8 text-sm text-neutral-600">
          No shipping locations yet. Add your first address to use it at checkout.
        </div>
      )}
    </div>
  )
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting,
  isSettingDefault,
}: {
  address: ShippingAddress
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
  isDeleting: boolean
  isSettingDefault: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium text-neutral-950">{address.label || 'Shipping location'}</p>
        {address.isDefault ? (
          <span className="border border-neutral-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-900">
            Default
          </span>
        ) : null}
      </div>
      <p className="text-sm text-neutral-600">{formatShippingAddressSummary(address)}</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onEdit}>
          Edit
        </Button>
        {!address.isDefault ? (
          <Button type="button" variant="ghost" disabled={isSettingDefault} onClick={onSetDefault}>
            Make default
          </Button>
        ) : null}
        <Button type="button" variant="ghost" disabled={isDeleting} onClick={onDelete}>
          Remove
        </Button>
      </div>
    </div>
  )
}

function AddressEditor({
  title,
  submitLabel,
  initialValues,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  title: string
  submitLabel: string
  initialValues: ShippingAddressFormValues
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: (values: ShippingAddressFormValues) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingAddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialValues,
  })

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      <ShippingAddressForm register={register} errors={errors} />
      <AddressEditorActions submitLabel={submitLabel} isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  )
}

function AddressEditorActions({
  submitLabel,
  isSubmitting,
  onCancel,
}: {
  submitLabel: string
  isSubmitting: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}
