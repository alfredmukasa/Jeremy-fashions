-- =============================================================================
-- Jeremy Atelier — initial schema
-- Tables: products, categories, waitlist, discount_codes
-- =============================================================================

-- pgcrypto is needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
    id           uuid primary key default gen_random_uuid(),
    created_at   timestamptz not null default now(),
    name         text not null,
    slug         text not null unique,
    description  text,
    image_url    text
);

create index if not exists categories_slug_idx on public.categories (slug);

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create table if not exists public.products (
    id              uuid primary key default gen_random_uuid(),
    created_at      timestamptz not null default now(),
    title           text not null,
    slug            text not null unique,
    description     text not null default '',
    price           numeric(10, 2) not null check (price >= 0),
    compare_price   numeric(10, 2) check (compare_price is null or compare_price >= 0),
    category        text not null references public.categories (slug) on update cascade,
    brand           text,
    stock_quantity  integer not null default 0 check (stock_quantity >= 0),
    featured        boolean not null default false,
    rating          numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
    image_url       text not null,
    gallery_images  text[] not null default '{}',
    tags            text[] not null default '{}',
    sku             text unique,
    status          text not null default 'active' check (status in ('active', 'draft', 'archived')),
    -- Frontend-specific extensions, kept on the same table for query simplicity.
    gender          text not null default 'unisex' check (gender in ('men', 'women', 'unisex')),
    sizes           text[] not null default '{}',
    colors          jsonb not null default '[]'::jsonb
);

create index if not exists products_slug_idx       on public.products (slug);
create index if not exists products_category_idx   on public.products (category);
create index if not exists products_featured_idx   on public.products (featured);
create index if not exists products_status_idx     on public.products (status);
create index if not exists products_created_at_idx on public.products (created_at desc);

-- -----------------------------------------------------------------------------
-- waitlist
-- -----------------------------------------------------------------------------
create table if not exists public.waitlist (
    id                   uuid primary key default gen_random_uuid(),
    created_at           timestamptz not null default now(),
    full_name            text not null,
    email                text not null,
    phone                text,
    interested_product   uuid references public.products (id) on delete set null,
    status               text not null default 'pending'
                          check (status in ('pending', 'notified', 'converted', 'archived')),
    discount_code_sent   boolean not null default false,
    constraint waitlist_email_unique unique (email)
);

create index if not exists waitlist_email_idx              on public.waitlist (email);
create index if not exists waitlist_status_idx             on public.waitlist (status);
create index if not exists waitlist_interested_product_idx on public.waitlist (interested_product);
create index if not exists waitlist_created_at_idx         on public.waitlist (created_at desc);

-- -----------------------------------------------------------------------------
-- discount_codes
-- -----------------------------------------------------------------------------
create table if not exists public.discount_codes (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),
    code        text not null unique,
    percentage  integer not null check (percentage > 0 and percentage <= 100),
    active      boolean not null default true,
    expires_at  timestamptz
);

create index if not exists discount_codes_code_idx   on public.discount_codes (code);
create index if not exists discount_codes_active_idx on public.discount_codes (active);

-- =============================================================================
-- Row-Level Security
-- Public storefront uses the anon key, so we expose only safe read paths and
-- only allow inserts on waitlist. All writes to products / discount_codes must
-- happen with the service role key (server-side / admin tooling).
-- =============================================================================

alter table public.products       enable row level security;
alter table public.categories     enable row level security;
alter table public.waitlist       enable row level security;
alter table public.discount_codes enable row level security;

-- Anyone can read active products & categories.
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
    on public.products for select
    using (status = 'active');

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
    on public.categories for select
    using (true);

-- Anonymous users can join the waitlist, but cannot read other entries.
drop policy if exists "waitlist_anon_insert" on public.waitlist;
create policy "waitlist_anon_insert"
    on public.waitlist for insert
    with check (true);

drop policy if exists "waitlist_self_check" on public.waitlist;
create policy "waitlist_self_check"
    on public.waitlist for select
    using (false);

-- Discount codes are admin-only; storefront does not list them.
drop policy if exists "discount_codes_no_public" on public.discount_codes;
create policy "discount_codes_no_public"
    on public.discount_codes for select
    using (false);
