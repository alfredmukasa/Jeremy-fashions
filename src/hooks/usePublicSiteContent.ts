import { useQuery } from '@tanstack/react-query'

import { fetchPublicSiteContent } from '../services/siteContentService'

export function usePublicSiteContent() {
  return useQuery({
    queryKey: ['public', 'site-content'],
    queryFn: fetchPublicSiteContent,
    staleTime: 30_000,
  })
}
