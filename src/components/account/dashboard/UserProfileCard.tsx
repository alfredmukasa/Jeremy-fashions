import { HiOutlineSparkles } from 'react-icons/hi2'

import { cn } from '../../../utils/cn'

export function UserProfileCard({
  userName,
  email,
  memberSince,
  totalOrders,
  savedCount,
  addressCount,
  className,
}: {
  userName: string
  email: string
  memberSince: string
  totalOrders: number
  savedCount: number
  addressCount: number
  className?: string
}) {
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <section
      className={cn(
        'rounded-sm border border-neutral-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-8',
        className,
      )}
      aria-labelledby="account-profile-summary"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-medium uppercase tracking-[0.12em] text-white"
          >
            {initials || 'JF'}
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Profile summary</p>
            <h2 id="account-profile-summary" className="mt-2 font-serif text-2xl text-neutral-950">
              {userName}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">{email}</p>
            <p className="mt-3 text-sm text-neutral-600">Member since {memberSince}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-neutral-100 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-700">
          <HiOutlineSparkles className="h-3.5 w-3.5" aria-hidden />
          Recent activity
        </div>
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <ProfileStat label="Total orders" value={totalOrders} />
        <ProfileStat label="Saved pieces" value={savedCount} />
        <ProfileStat label="Addresses" value={addressCount} />
      </dl>
    </section>
  )
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-neutral-100 bg-neutral-50 px-4 py-4">
      <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{label}</dt>
      <dd className="mt-2 font-serif text-3xl text-neutral-950">{value}</dd>
    </div>
  )
}
