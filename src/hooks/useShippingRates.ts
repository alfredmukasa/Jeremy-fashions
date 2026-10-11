import { useQuery } from '@tanstack/react-query'

import { fetchShippingRates } from '../lib/paymentApi'

export function useShippingRates() {
  return useQuery({
    queryKey: ['checkout', 'shipping-rates'],
    queryFn: fetchShippingRates,
    staleTime: 15_000,
  })
}
