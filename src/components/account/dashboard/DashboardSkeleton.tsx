import { Container } from '../../layout/Container'

export function DashboardSkeleton() {
  return (
    <div className="pb-24">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-12 md:py-16">
          <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
          <div className="mt-3 h-10 w-full max-w-lg animate-pulse rounded bg-neutral-200" />
          <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-neutral-200" />
          <MotionSafeDashboardSkeletonStats />
        </Container>
      </div>
      <Container className="py-12 md:py-16">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="h-80 w-full animate-pulse rounded-sm bg-neutral-100 lg:w-72" />
          <div className="flex-1 space-y-6">
            <div className="h-56 animate-pulse rounded-sm bg-neutral-100" />
            <div className="h-40 animate-pulse rounded-sm bg-neutral-100" />
            <div className="h-64 animate-pulse rounded-sm bg-neutral-100" />
          </div>
        </div>
      </Container>
    </div>
  )
}

function MotionSafeDashboardSkeletonStats() {
  return (
    <div className="mt-8 flex gap-6">
      <div className="h-10 w-32 animate-pulse rounded bg-neutral-200" />
      <div className="h-10 w-28 animate-pulse rounded bg-neutral-200" />
    </div>
  )
}
