import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { guestLoginPath, guestRegisterPath } from '../../lib/guestAuthPaths'

/** Sign-in and sign-up links shown while a visitor checks out without an account. */
export function GuestCheckoutAccountNote({ email }: { email?: string }) {
  return (
    <p className="mt-3 text-xs leading-relaxed text-neutral-500">
      Checking out as a guest. We&rsquo;ll email your receipt and tracking updates here.{' '}
      <Link
        to={guestLoginPath(email)}
        state={{ from: ROUTES.checkout }}
        className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-600"
      >
        Sign in
      </Link>
      {' or '}
      <Link
        to={guestRegisterPath(email)}
        state={{ from: ROUTES.checkout }}
        className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-600"
      >
        create an account
      </Link>
      .
    </p>
  )
}
