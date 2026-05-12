import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BRAND, ROUTES } from '../../constants'
import { cn } from '../../utils/cn'

type AuthLayoutProps = {
  title: string
  subtitle?: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Editorial split: visual panel + form. Matches luxury / monochrome direction from the auth spec.
 */
export function AuthLayout({ title, subtitle, eyebrow, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-svh bg-neutral-950 text-neutral-100">
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="relative hidden overflow-hidden lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-90"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, rgba(10,10,10,0.2), rgba(10,10,10,0.85)), url(https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&q=80)',
            }}
          />
          <div className="relative flex h-full flex-col justify-end p-12 xl:p-16">
            <Link
              to={ROUTES.home}
              className="absolute left-12 top-12 text-[11px] font-medium uppercase tracking-[0.35em] text-white/80 transition hover:text-white xl:left-16 xl:top-16"
            >
              {BRAND}
            </Link>
            <p className="font-['Space_Grotesk',var(--font-sans)] text-xs font-medium uppercase tracking-[0.35em] text-white/50">
              Atelier access
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-white xl:text-5xl">
              Precision tailoring.
              <br />
              Quiet confidence.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/65">
              Members receive early access to drops, private fittings, and studio notes.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-14 sm:px-10 lg:px-14 xl:px-20">
          <Link
            to={ROUTES.home}
            className={cn(
              'mb-10 text-[11px] font-medium uppercase tracking-[0.35em] text-neutral-500 transition hover:text-neutral-200 lg:hidden',
            )}
          >
            ← {BRAND}
          </Link>
          {eyebrow ? (
            <p className="font-['Space_Grotesk',var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 font-serif text-3xl tracking-tight text-white sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-400">{subtitle}</p> : null}
          <div className="mt-10">{children}</div>
          {footer ? <div className="mt-10 border-t border-white/10 pt-8">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
