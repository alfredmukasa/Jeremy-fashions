import { Link } from 'react-router-dom'

import { DEFAULT_SHIPPING_INSTRUCTIONS } from '../../constants/siteContent'
import { ROUTES } from '../../constants'
import { usePublicSiteContent } from '../../hooks/usePublicSiteContent'
import { formatPolicyUpdated } from '../../services/siteContentService'
import { LegalPageLayout } from './LegalPageLayout'

export default function ShippingPage() {
  const siteContent = usePublicSiteContent()
  const policy = siteContent.data?.shippingInstructions ?? DEFAULT_SHIPPING_INSTRUCTIONS
  const loading = siteContent.isLoading && !siteContent.data

  return (
    <LegalPageLayout
      title={policy.title || 'Shipping'}
      path="/shipping"
      lastUpdated={policy.published ? formatPolicyUpdated(policy.updatedAt) : 'Current'}
      metaDescription="Krewnox shipping instructions — delivery, timing, and how orders are sent."
      intro={
        <p>
          These instructions are the current shipping information for the store. Questions about an order can go
          through <Link to={ROUTES.contact}>Contact us</Link>.
        </p>
      }
    >
      {loading ? <p>Loading shipping instructions…</p> : <div className="whitespace-pre-wrap">{policy.body}</div>}
    </LegalPageLayout>
  )
}
