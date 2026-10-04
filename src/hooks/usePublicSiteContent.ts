import { useQuery } from '@tanstack/react-query'

import { DEFAULT_CONTACT_EMAIL } from '../constants/siteContent'
import { fetchPublicSiteContent } from '../services/siteContentService'

export function usePublicSiteContent() {
  return useQuery({
    queryKey: ['public', 'site-content'],
    queryFn: fetchPublicSiteContent,
    staleTime: 30_000,
  })
}

export function useSupportEmail(): string {
  const siteContent = usePublicSiteContent()
  return siteContent.data?.contactEmail || DEFAULT_CONTACT_EMAIL
}
