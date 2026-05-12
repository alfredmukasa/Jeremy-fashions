export function CheckoutTestCards() {
  if (!import.meta.env.DEV) return null

  return (
    <div className="border border-dashed border-neutral-300 bg-white p-4 text-xs text-neutral-600">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Stripe test cards</p>
      <ul className="mt-3 space-y-1">
        <li>Success: 4242 4242 4242 4242 · any future expiry · any CVC</li>
        <li>Decline: 4000 0000 0000 0002</li>
        <li>3D Secure: 4000 0027 6000 3184</li>
      </ul>
    </div>
  )
}
