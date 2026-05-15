import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { fetchPublicWaitlistMode } from '../services/globalSettingsService'

export type WaitlistModeContextValue = {
  /** When true, the public storefront should only expose `/waitlist` (admin routes stay available). */
  waitlistMode: boolean
  /** First remote read finished (or Supabase is disabled). Avoids redirect flashes before we know the flag. */
  ready: boolean
}

const WaitlistModeContext = createContext<WaitlistModeContextValue | null>(null)

export function WaitlistModeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['public', 'waitlistMode'],
    queryFn: fetchPublicWaitlistMode,
    enabled: isSupabaseConfigured,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  })

  const ready = !isSupabaseConfigured || query.isFetched
  const waitlistMode = isSupabaseConfigured ? Boolean(query.data) : false

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const client = supabase
    const channel = client
      .channel('public-global-settings-waitlist')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'global_settings' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['public', 'waitlistMode'] })
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [queryClient])

  return (
    <WaitlistModeContext.Provider value={{ waitlistMode, ready }}>{children}</WaitlistModeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally colocated with its provider
export function useWaitlistMode(): WaitlistModeContextValue {
  const ctx = useContext(WaitlistModeContext)
  if (!ctx) {
    throw new Error('useWaitlistMode must be used within WaitlistModeProvider')
  }
  return ctx
}
