-- =============================================================================
-- Waitlist-only mode flag (public read, admin write) + waitlist social field
-- =============================================================================

-- -----------------------------------------------------------------------------
-- global_settings (singleton row)
-- -----------------------------------------------------------------------------
create table if not exists public.global_settings (
    id             uuid primary key default gen_random_uuid(),
    waitlist_mode  boolean not null default false,
    updated_at     timestamptz not null default now()
);

insert into public.global_settings (id, waitlist_mode)
values ('00000000-0000-0000-0000-000000000001'::uuid, false)
on conflict (id) do nothing;

alter table public.global_settings enable row level security;

-- Storefront must read the flag without authenticating; updates are admin-only.
drop policy if exists "global_settings_public_read" on public.global_settings;
create policy "global_settings_public_read"
  on public.global_settings for select
  using (true);

drop policy if exists "global_settings_admin_write" on public.global_settings;
drop policy if exists "global_settings_admin_update" on public.global_settings;
create policy "global_settings_admin_update"
  on public.global_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- waitlist: optional Instagram handle
-- -----------------------------------------------------------------------------
alter table public.waitlist
  add column if not exists instagram text;
