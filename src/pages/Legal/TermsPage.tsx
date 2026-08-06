import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { LegalPageLayout } from './LegalPageLayout'

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="August 5, 2026"
      metaDescription="The terms that govern your use of Krewnox and any purchase you make on the site."
      intro={
        <p>
          These Terms of Service ("Terms") govern your access to and use of krewnox.ca (the "Site") and any
          purchase you make through it. By browsing the Site, creating an account, or placing an order, you agree
          to these Terms. If you do not agree, do not use the Site.
        </p>
      }
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          Krewnox ("Krewnox," "we," "us," "our") operates an online storefront selling apparel, footwear, and
          accessories. Krewnox is operated by{' '}
          <strong>[INSERT REGISTERED BUSINESS NAME AND ENTITY TYPE, e.g. "Krewnox Inc., a corporation"]</strong>,
          located at <strong>[INSERT REGISTERED BUSINESS ADDRESS]</strong>. You can reach us at{' '}
          <a href="mailto:support@krewnox.ca">support@krewnox.ca</a>.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years old, or the age of majority in your province or territory, to create an
          account or place an order. If you are under that age, you may only use the Site under the supervision of
          a parent or legal guardian who agrees to these Terms on your behalf.
        </p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <p>
          You can browse and check out as a guest, or create an account (by email and password, or by signing in
          with Google) to save addresses, view order history, and maintain a wishlist. You're responsible for
          keeping your login credentials confidential and for all activity under your account. Tell us right away
          at <a href="mailto:support@krewnox.ca">support@krewnox.ca</a> if you suspect unauthorized access.
        </p>
      </section>

      <section>
        <h2>4. Products, pricing &amp; availability</h2>
        <p>
          We try to describe and price products accurately, but errors happen — in descriptions, images, pricing,
          or stock levels. If we discover a pricing or listing error on an order you've placed, we'll contact you
          before charging you the corrected amount, and you may cancel the order if you don't want to proceed.
          Prices are listed in Canadian dollars (CAD) unless stated otherwise and don't include duties, taxes, or
          shipping unless noted at checkout. We may change prices, discontinue products, or limit order quantities
          at any time.
        </p>
      </section>

      <section>
        <h2>5. Orders &amp; payment</h2>
        <p>
          Placing an order is an offer to buy, which we may accept or decline (for example, if we suspect fraud,
          if an item is out of stock, or if there was a pricing error). Payments are processed by{' '}
          <a href="https://stripe.com/legal" target="_blank" rel="noreferrer">
            Stripe
          </a>
          , our third-party payment processor. We never see or store your full card number — Stripe handles that
          directly and securely. By placing an order, you confirm that the payment method you're using is yours or
          that you're authorized to use it.
        </p>
      </section>

      <section>
        <h2>6. Shipping &amp; delivery</h2>
        <p>
          Shipping options, costs, and estimated delivery windows are shown at checkout for your destination and
          vary by location. Delivery estimates are our best expectation, not a guarantee — carrier delays,
          customs processing, and other factors outside our control can affect them. Risk of loss and title to
          items you purchase pass to you once the order is handed to the shipping carrier. International orders
          may be subject to customs duties, import taxes, or fees charged by the destination country; those are
          your responsibility and aren't included in the price you pay us.
        </p>
      </section>

      <section>
        <h2>7. Returns, exchanges &amp; refunds</h2>
        <p>
          Returns, exchanges, and refunds are governed by our{' '}
          <Link to={ROUTES.refundPolicy}>Refund Policy</Link>, which is part of these Terms.
        </p>
      </section>

      <section>
        <h2>8. Waitlist &amp; early access</h2>
        <p>
          From time to time the Site may run in a waitlist or early-access mode, where joining the waitlist with
          your name and email doesn't guarantee purchase access, a specific access date, or availability of any
          particular product.
        </p>
      </section>

      <section>
        <h2>9. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Site for any unlawful purpose or in violation of these Terms;</li>
          <li>Attempt to gain unauthorized access to any account, system, or data on the Site;</li>
          <li>Scrape, crawl, or harvest data from the Site by automated means without our written permission;</li>
          <li>Interfere with or disrupt the Site's security, availability, or infrastructure;</li>
          <li>Use stolen payment methods, or place orders with the intent to defraud us or our payment processor;</li>
          <li>Misuse discount or promotional codes (e.g., codes not issued to you, or abuse of referral/waitlist perks); or</li>
          <li>Resell products purchased from the Site in the course of a commercial business without our written consent.</li>
        </ul>
        <p>
          We may suspend or terminate your account and cancel pending orders if we reasonably believe you've
          violated this section.
        </p>
      </section>

      <section>
        <h2>10. Intellectual property</h2>
        <p>
          The Site and its content — including the Krewnox name and logo, product photography, text, graphics, and
          design — are owned by us or our licensors and protected by copyright, trademark, and other laws. We
          grant you a limited, revocable, non-transferable license to access and use the Site for personal,
          non-commercial shopping purposes. You may not copy, reproduce, or redistribute Site content without our
          prior written permission.
        </p>
      </section>

      <section>
        <h2>11. Third-party services</h2>
        <p>
          The Site relies on third-party services to operate, including Stripe (payments) and Supabase (account
          authentication and data storage). If you sign in with Google, that authentication is governed by
          Google's own terms as well as ours. Your use of those integrations is also subject to the applicable
          third party's own terms and privacy practices.
        </p>
      </section>

      <section>
        <h2>12. Disclaimers</h2>
        <p>
          The Site is provided "as is" and "as available," without warranties of any kind, express or implied,
          including implied warranties of merchantability, fitness for a particular purpose, or non-infringement,
          except where such warranties can't be excluded by law. We don't guarantee the Site will be uninterrupted,
          secure, or error-free.
        </p>
      </section>

      <section>
        <h2>13. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Krewnox will not be liable for any indirect, incidental,
          special, consequential, or punitive damages, or any loss of profits or revenue, arising out of or
          related to your use of the Site or purchase of products. Our total liability to you for any claim
          arising from these Terms or your order will not exceed the amount you paid for the order giving rise to
          the claim. Nothing in these Terms limits liability that can't be limited under applicable law (for
          example, liability for gross negligence or willful misconduct, where excluding it isn't permitted).
        </p>
      </section>

      <section>
        <h2>14. Indemnification</h2>
        <p>
          You agree to indemnify and hold Krewnox harmless from any claims, damages, liabilities, and expenses
          (including reasonable legal fees) arising from your violation of these Terms or misuse of the Site.
        </p>
      </section>

      <section>
        <h2>15. Termination</h2>
        <p>
          We may suspend or terminate your access to the Site or your account at any time, with or without notice,
          for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
        </p>
      </section>

      <section>
        <h2>16. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. We'll update the "Last updated" date above when we do.
          Continuing to use the Site after changes take effect means you accept the updated Terms.
        </p>
      </section>

      <section>
        <h2>17. Governing law</h2>
        <p>
          These Terms are governed by the laws of the Province of{' '}
          <strong>[INSERT PROVINCE/TERRITORY]</strong>, Canada, without regard to conflict-of-law principles, and
          any dispute arising from these Terms or your use of the Site will be subject to the exclusive
          jurisdiction of the courts located in <strong>[INSERT CITY, PROVINCE]</strong>. This doesn't take away
          any consumer protection rights you have under the mandatory laws of the province or country where you
          live.
        </p>
      </section>

      <section>
        <h2>18. Contact</h2>
        <p>
          Questions about these Terms? Reach us at <a href="mailto:support@krewnox.ca">support@krewnox.ca</a>.
        </p>
      </section>
    </LegalPageLayout>
  )
}
