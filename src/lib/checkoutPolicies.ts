import { DEFAULT_RETURN_POLICY, DEFAULT_SHIPPING_INSTRUCTIONS } from '../constants/siteContent'
import { usePublicSiteContent } from '../hooks/usePublicSiteContent'

function publishedBody(published: boolean | undefined, body: string | undefined, fallback: string) {
  return published && body?.trim() ? body.trim() : fallback
}

/** First paragraph of a published policy, kept as written. */
export function policyExcerpt(body: string, max = 220): string {
  const trimmed = body.trim()
  if (trimmed.length <= max) return trimmed
  const paragraph = trimmed.split(/\n\s*\n/)[0]?.trim() || trimmed
  if (paragraph.length <= max) return paragraph
  const cut = paragraph.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

export function useCheckoutPolicies() {
  const siteContent = usePublicSiteContent()
  const shippingBody = publishedBody(
    siteContent.data?.shippingInstructions?.published,
    siteContent.data?.shippingInstructions?.body,
    DEFAULT_SHIPPING_INSTRUCTIONS.body,
  )
  const returnsBody = publishedBody(
    siteContent.data?.returnPolicy?.published,
    siteContent.data?.returnPolicy?.body,
    DEFAULT_RETURN_POLICY.body,
  )

  return { shippingBody, returnsBody }
}
