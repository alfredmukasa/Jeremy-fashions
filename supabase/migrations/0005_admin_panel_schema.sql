-- =============================================================================
-- Admin panel extensions: orders, audit logs, site settings, profile flags
-- Requires 0003_admin_rls_profiles.sql on fresh databases. The bootstrap below
-- lets this migration run safely if profiles was never created.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profiles bootstrap (no-op when 0003 already ran)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
    id         uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    email      text,
    full_name  text
);

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin';
$$;

-- -----------------------------------------------------------------------------
-- Customer profile extensions (admin user management)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists suspended boolean not null default false;

alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'banned'));

create index if not exists profiles_account_status_idx on public.profiles (account_status);

-- -----------------------------------------------------------------------------
-- Orders (admin fulfillment; storefront checkout can populate later)
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
    id               uuid primary key default gen_random_uuid(),
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    user_id          uuid references auth.users (id) on delete set null,
    email            text not null,
    status           text not null default 'pending'
                      check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    payment_status   text not null default 'unpaid'
                      check (payment_status in ('unpaid', 'paid', 'refunded', 'partial_refund')),
    total_amount     numeric(10, 2) not null default 0 check (total_amount >= 0),
    currency         text not null default 'USD',
    shipping_address jsonb,
    notes            text
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_user_id_idx on public.orders (user_id);

create table if not exists public.order_items (
    id          uuid primary key default gen_random_uuid(),
    order_id    uuid not null references public.orders (id) on delete cascade,
    product_id  uuid references public.products (id) on delete set null,
    title       text not null,
    quantity    integer not null check (quantity > 0),
    unit_price  numeric(10, 2) not null check (unit_price >= 0),
    sku         text
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- -----------------------------------------------------------------------------
-- Audit logs (security / admin activity)
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
    id           uuid primary key default gen_random_uuid(),
    created_at   timestamptz not null default now(),
    actor_id     uuid references auth.users (id) on delete set null,
    actor_email  text,
    action       text not null,
    entity_type  text,
    entity_id    text,
    metadata     jsonb not null default '{}'::jsonb
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);

-- -----------------------------------------------------------------------------
-- Site settings (key-value JSON)
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
    key         text primary key,
    value       jsonb not null default '{}'::jsonb,
    updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.audit_logs enable row level security;
alter table public.site_settings enable row level security;

-- Orders: customers see own rows; admins see all
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_admin_insert" on public.orders;
create policy "orders_admin_insert"
  on public.orders for insert
  with check (public.is_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
  on public.orders for update
  using (public.is_admin());

drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete"
  on public.orders for delete
  using (public.is_admin());

-- Order items: follow parent order visibility
drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin"
  on public.order_items for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_items_admin_write" on public.order_items;
create policy "order_items_admin_write"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- Audit logs: admin read; admins may append entries
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
  on public.audit_logs for select
  using (public.is_admin());

drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_insert"
  on public.audit_logs for insert
  with check (public.is_admin());

-- Site settings: admin only
drop policy if exists "site_settings_admin_select" on public.site_settings;
create policy "site_settings_admin_select"
  on public.site_settings for select
  using (public.is_admin());

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write"
  on public.site_settings for all
  using (public.is_admin())
  with check (public.is_admin());
