import { LegalPageLayout } from './LegalPageLayout'

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="August 5, 2026"
      metaDescription="What personal data Krewnox collects, how it's used, who it's shared with, and how to request access or deletion."
      intro={
        <p>
          This Privacy Policy explains what personal information Krewnox collects when you use krewnox.ca (the
          "Site"), how we use and share it, and the choices you have. It applies whether you're browsing, creating
          an account, or placing an order.
        </p>
      }
    >
      <section>
        <h2>1. Information we collect</h2>
        <h3>Information you give us directly</h3>
        <ul>
          <li>
            <strong>Account information</strong> — name and email address, and a password if you register directly
            (we never see or store your password in plain text — authentication is handled by our provider,
            Supabase). If you sign in with Google, we receive your name, email, and profile photo from Google.
          </li>
          <li>
            <strong>Order information</strong> — shipping address, billing address, items purchased, and order
            history.
          </li>
          <li>
            <strong>Payment information</strong> — entered directly into forms hosted by our payment processor,
            Stripe. We do not receive or store your full card number, expiry date, or CVC — Stripe handles that
            directly, and Krewnox only receives confirmation of payment status and a reference ID.
          </li>
          <li>
            <strong>Waitlist information</strong> — if you join our waitlist, we collect your name and email.
          </li>
          <li>
            <strong>Customer support</strong> — anything you tell us when you email{' '}
            <a href="mailto:support@krewnox.ca">support@krewnox.ca</a>.
          </li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Cart, theme, and cached catalog data</strong> — stored in your browser's local storage so your
            cart persists between visits, your light/dark theme preference is remembered, and product pages load
            faster. This data stays on your device and identifies your browser, not you personally.
          </li>
          <li>
            <strong>Standard technical logs</strong> — like IP address, browser type, and pages visited, collected
            by our hosting infrastructure for security and reliability purposes (e.g., detecting abuse).
          </li>
        </ul>
        <p>
          We do not currently use third-party advertising trackers or web analytics services (like Google
          Analytics) on the Site. If that changes, we'll update this policy.
        </p>
      </section>

      <section>
        <h2>2. How we use your information</h2>
        <ul>
          <li>To process and fulfill your orders, including payment, shipping, and customer support;</li>
          <li>To create and maintain your account, including saved addresses and order history;</li>
          <li>To respond to your questions and support requests;</li>
          <li>To detect, prevent, and investigate fraud, abuse, or security incidents;</li>
          <li>To operate, maintain, and improve the Site; and</li>
          <li>
            To send you service-related communications (like order confirmations and shipping updates), and
            marketing communications only if you've opted in — you can opt out of marketing emails at any time.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Who we share information with</h2>
        <p>
          We don't sell your personal information. We share it only with service providers who need it to help us
          run the Site, under contracts that limit them to using it for that purpose:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> — processes your payment. See{' '}
            <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
              Stripe's Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Supabase</strong> — hosts our database and handles account authentication. Your account data
            is protected by row-level access rules so it's only reachable by you or authorized Krewnox staff. See{' '}
            <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">
              Supabase's Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Shipping carriers</strong> — receive your name and shipping address to deliver your order.
          </li>
          <li>
            <strong>Google</strong> — if you choose to sign in with Google, Google acts as your identity provider
            for that sign-in.
          </li>
        </ul>
        <p>
          We may also disclose information if required by law, to comply with legal process, or to protect the
          rights, property, or safety of Krewnox, our customers, or others.
        </p>
      </section>

      <section>
        <h2>4. Cookies &amp; local storage</h2>
        <p>
          The Site uses your browser's local/session storage — not third-party tracking cookies — to keep you
          signed in, remember your cart and theme preference, and cache public catalog data (products and
          categories) so pages load faster on repeat visits. Clearing your browser storage will reset these but
          won't delete your account or order history, which live in our database.
        </p>
      </section>

      <section>
        <h2>5. Data retention</h2>
        <p>
          We keep account and order information for as long as your account is active, and for a reasonable period
          afterward to meet accounting, tax, and legal obligations (typically the retention period required for
          business records under applicable law). If you request deletion, we'll remove or anonymize your personal
          information except where we're required to keep it (for example, financial records tied to a completed
          transaction).
        </p>
      </section>

      <section>
        <h2>6. Your rights &amp; choices</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, or request deletion of your
          personal information, object to or restrict certain processing, or request a copy of your data in a
          portable format. To exercise any of these, email{' '}
          <a href="mailto:support@krewnox.ca">support@krewnox.ca</a> from the email address on your account — we'll
          verify your identity and respond within a reasonable time.
        </p>
        <p>
          You can also update your name, email, and saved addresses directly from your account dashboard, and
          unsubscribe from marketing emails using the link in any marketing message we send.
        </p>
        <p>
          If you're in Canada, this processing is subject to the Personal Information Protection and Electronic
          Documents Act (PIPEDA) and applicable provincial privacy law. If you're in the European Economic Area or
          UK, you have rights under the GDPR/UK GDPR. If you're a California resident, you have rights under the
          CCPA/CPRA. We honor applicable requests regardless of where you live.
        </p>
      </section>

      <section>
        <h2>7. Children's privacy</h2>
        <p>
          The Site isn't directed at children, and we don't knowingly collect personal information from anyone
          under 13 (or the applicable minimum age in your jurisdiction). If you believe a child has given us
          personal information, contact us and we'll delete it.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We use reasonable technical and organizational safeguards to protect your information — including
          encrypted connections (HTTPS) between your browser and our servers, database-level access rules that
          restrict who can read account and order data, and processing payments through a PCI-compliant provider
          (Stripe) so we never handle raw card data ourselves. No method of transmission or storage is 100%
          secure, and we can't guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>9. International data transfers</h2>
        <p>
          Krewnox is based in Canada. Our service providers (including Stripe and Supabase) may process and store
          data in Canada, the United States, or other countries where they operate. Where required, we rely on
          appropriate safeguards for these transfers as required by applicable law.
        </p>
      </section>

      <section>
        <h2>10. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We'll update the "Last updated" date above when we
          do, and for material changes we'll take reasonable steps to let you know (such as a notice on the Site).
        </p>
      </section>

      <section>
        <h2>11. Contact us</h2>
        <p>
          Questions about this policy or how we handle your data? Email{' '}
          <a href="mailto:support@krewnox.ca">support@krewnox.ca</a>.
        </p>
      </section>
    </LegalPageLayout>
  )
}
