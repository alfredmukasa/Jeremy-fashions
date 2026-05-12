import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiMenu, FiX } from 'react-icons/fi'

import { ROUTES } from '../../constants'
import { getAdminRole } from '../../lib/adminPermissions'
import { supabase } from '../../lib/supabase'
import { Button } from '../common/Button'
import { Container } from '../layout/Container'
import { useAdminSession } from './AdminSessionContext'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  const session = useAdminSession()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = getAdminRole(session.user)

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    toast.success('Signed out')
    navigate(ROUTES.adminLogin, { replace: true })
  }

  return (
    <div className="min-h-svh bg-neutral-100 text-neutral-950">
      <div className="border-b border-neutral-900 bg-neutral-950 text-white">
        <Container className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/45">Jeremy Atelier</p>
            <p className="mt-1 font-serif text-xl">Admin</p>
          </div>
          <div className="hidden items-center gap-4 text-sm text-white/70 md:flex">
            <span>{session.user.email}</span>
            <span className="rounded-none border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">
              {role.replace('_', ' ')}
            </span>
            <Button
              type="button"
              variant="outline"
              className="border-white/40 bg-transparent px-4 py-2 text-white hover:bg-white/10"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center border border-white/30 p-2 text-white md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
          </button>
        </Container>
      </div>

      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside
          className={`${
            mobileOpen ? 'block' : 'hidden'
          } w-full shrink-0 border-b border-neutral-900 bg-neutral-950 px-4 py-6 md:block md:w-72 md:border-b-0 md:border-r`}
        >
          <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          <div className="mt-8 border-t border-white/10 pt-6 md:hidden">
            <p className="text-xs text-white/60">{session.user.email}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full border-white/40 bg-transparent text-white hover:bg-white/10"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Container className="py-8 md:py-12">
            <div className="mb-8 flex justify-end md:hidden">
              <Link
                to={ROUTES.shop}
                className="text-xs uppercase tracking-[0.2em] text-neutral-600 underline-offset-4 hover:underline"
              >
                View storefront
              </Link>
            </div>
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  )
}
