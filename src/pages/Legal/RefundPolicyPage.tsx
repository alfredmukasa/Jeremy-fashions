import { LegalPageLayout } from './LegalPageLayout'

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout
      title="Refund Policy"
      lastUpdated="August 5, 2026"
      metaDescription="Krewnox's return, exchange, and refund policy — return windows, eligibility, and how refunds are issued."
      intro={
        <p>
          We want you to be happy with what you ordered. This policy explains how returns, exchanges, and refunds
          work. It's part of our <a href="/terms">Terms of Service</a>.
        </p>
      }
    >
      <section>
        <h2>1. Return window</h2>
        <p>
          You can request a return or exchange within <strong>30 days</strong> of the delivery date shown on your
          order tracking. After 30 days, we're unable to offer a refund or exchange.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>To be eligible for a return, an item must be:</p>
        <ul>
          <li>Unworn, unwashed, and in the condition you received it;</li>
          <li>In its original packaging, with tags still attached; and</li>
          <li>Accompanied by your order number or proof of purchase.</li>
        </ul>
        <p>
          Items marked "final sale" at the time of purchase, and gift cards (if offered), are not eligible for
          return or refund except where required by law or covered under Section 5 below (damaged, defective, or
          incorrect items).
        </p>
      </section>

      <section>
        <h2>3. How to start a return</h2>
        <p>
          Email <a href="mailto:support@krewnox.ca">support@krewnox.ca</a> with your order number and the item(s)
          you'd like to return. We'll confirm eligibility and send you return instructions, including the return
          address. Please don't send items back without contacting us first — returns sent without prior contact
          may be delayed or refused.
        </p>
      </section>

      <section>
        <h2>4. Refunds</h2>
        <p>
          Once we receive and inspect your return, we'll notify you by email whether it's approved. Approved
          refunds are issued to your original payment method through Stripe, our payment processor, typically
          within 5–10 business days of approval — actual posting time then depends on your bank or card issuer.
          Original shipping charges are non-refundable unless the return is due to our error (see Section 5).
        </p>
      </section>

      <section>
        <h2>5. Damaged, defective, or incorrect items</h2>
        <p>
          If an item arrives damaged, defective, or isn't what you ordered, contact us within 7 days of delivery
          at <a href="mailto:support@krewnox.ca">support@krewnox.ca</a> with your order number and a photo of the
          issue. We'll cover return shipping and provide a full refund or free replacement, whichever you prefer.
        </p>
      </section>

      <section>
        <h2>6. Exchanges</h2>
        <p>
          Need a different size or color? Let us know when you contact us to start a return — we'll do our best to
          ship the replacement as soon as we receive your original item, subject to stock availability. If the
          item you want is out of stock, we'll issue a refund instead.
        </p>
      </section>

      <section>
        <h2>7. Return shipping costs</h2>
        <p>
          Unless the return is due to our error (Section 5), return shipping costs are the customer's
          responsibility. We'll provide the return address when you contact us; return shipping is not currently
          prepaid.
        </p>
      </section>

      <section>
        <h2>8. Order cancellations</h2>
        <p>
          If you need to cancel or change an order, contact us immediately at{' '}
          <a href="mailto:support@krewnox.ca">support@krewnox.ca</a>. We can only cancel or modify orders that
          haven't yet shipped — once an order has shipped, it's handled under the return process above.
        </p>
      </section>

      <section>
        <h2>9. Questions</h2>
        <p>
          Reach us any time at <a href="mailto:support@krewnox.ca">support@krewnox.ca</a> and we'll help sort it
          out.
        </p>
      </section>
    </LegalPageLayout>
  )
}
