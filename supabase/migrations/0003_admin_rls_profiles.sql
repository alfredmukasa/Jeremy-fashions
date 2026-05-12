-- =============================================================================
-- Admin access + customer profiles (for dashboard "new users")
-- Admins: set App Metadata on the user in Supabase Dashboard:
--   { "role": "admin" }
-- Or via SQL: update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' ...
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Public profiles (mirrors auth signups; populated by trigger)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
    id         uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    email      text,
    full_name  text
);

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

alter table public.profiles enable row level security;

-- -----------------------------------------------------------------------------
-- JWT helper: admin role lives in app_metadata (included in JWT)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin';
$$;

-- -----------------------------------------------------------------------------
-- New auth users -> profile row
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do update
    set email     = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles: own row or admin
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- -----------------------------------------------------------------------------
-- Products: admin full access (OR with existing public read)
-- -----------------------------------------------------------------------------
drop policy if exists "products_admin_select" on public.products;
create policy "products_admin_select"
  on public.products for select
  using (public.is_admin());

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert"
  on public.products for insert
  with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update"
  on public.products for update
  using (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete"
  on public.products for delete
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Categories: admin writes
-- -----------------------------------------------------------------------------
drop policy if exists "categories_admin_insert" on public.categories;
create policy "categories_admin_insert"
  on public.categories for insert
  with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update"
  on public.categories for update
  using (public.is_admin());

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete"
  on public.categories for delete
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Waitlist: admin read / update (storefront insert unchanged)
-- -----------------------------------------------------------------------------
drop policy if exists "waitlist_admin_select" on public.waitlist;
create policy "waitlist_admin_select"
  on public.waitlist for select
  using (public.is_admin());

drop policy if exists "waitlist_admin_update" on public.waitlist;
create policy "waitlist_admin_update"
  on public.waitlist for update
  using (public.is_admin());

drop policy if exists "waitlist_admin_delete" on public.waitlist;
create policy "waitlist_admin_delete"
  on public.waitlist for delete
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Discount codes: admin full access (storefront still has no public read)
-- -----------------------------------------------------------------------------
drop policy if exists "discount_codes_admin_select" on public.discount_codes;
create policy "discount_codes_admin_select"
  on public.discount_codes for select
  using (public.is_admin());

drop policy if exists "discount_codes_admin_insert" on public.discount_codes;
create policy "discount_codes_admin_insert"
  on public.discount_codes for insert
  with check (public.is_admin());

drop policy if exists "discount_codes_admin_update" on public.discount_codes;
create policy "discount_codes_admin_update"
  on public.discount_codes for update
  using (public.is_admin());

drop policy if exists "discount_codes_admin_delete" on public.discount_codes;
create policy "discount_codes_admin_delete"
  on public.discount_codes for delete
  using (public.is_admin());
