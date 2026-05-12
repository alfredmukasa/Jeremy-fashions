-- Saved customer shipping locations with a single default per account

create table if not exists public.user_shipping_addresses (
    id           uuid primary key default gen_random_uuid(),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    user_id      uuid not null references auth.users (id) on delete cascade,
    label        text,
    full_name    text not null,
    line1        text not null,
    line2        text,
    city         text not null,
    region       text not null,
    postal_code  text not null,
    country      text not null,
    is_default   boolean not null default false
);

create index if not exists user_shipping_addresses_user_id_idx
  on public.user_shipping_addresses (user_id, created_at desc);

create unique index if not exists user_shipping_addresses_one_default_per_user_idx
  on public.user_shipping_addresses (user_id)
  where is_default;

create or replace function public.sync_user_shipping_address_default()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.user_shipping_addresses
      where user_id = new.user_id
        and id <> new.id
    ) then
      new.is_default := true;
    elsif new.is_default then
      update public.user_shipping_addresses
      set is_default = false,
          updated_at = now()
      where user_id = new.user_id
        and id <> new.id;
    end if;

    new.updated_at := now();
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.is_default and not old.is_default then
      update public.user_shipping_addresses
      set is_default = false,
          updated_at = now()
      where user_id = new.user_id
        and id <> new.id;
    end if;

    new.updated_at := now();
    return new;
  end if;

  return new;
end;
$$;

create or replace function public.promote_default_shipping_address()
returns trigger
language plpgsql
as $$
begin
  if old.is_default then
    update public.user_shipping_addresses
    set is_default = true,
        updated_at = now()
    where id = (
      select id
      from public.user_shipping_addresses
      where user_id = old.user_id
      order by created_at asc
      limit 1
    );
  end if;

  return old;
end;
$$;

drop trigger if exists user_shipping_addresses_sync_default on public.user_shipping_addresses;
create trigger user_shipping_addresses_sync_default
  before insert or update on public.user_shipping_addresses
  for each row
  execute function public.sync_user_shipping_address_default();

drop trigger if exists user_shipping_addresses_promote_default on public.user_shipping_addresses;
create trigger user_shipping_addresses_promote_default
  after delete on public.user_shipping_addresses
  for each row
  execute function public.promote_default_shipping_address();

alter table public.user_shipping_addresses enable row level security;

drop policy if exists "user_shipping_addresses_select_own" on public.user_shipping_addresses;
create policy "user_shipping_addresses_select_own"
  on public.user_shipping_addresses for select
  using (auth.uid() = user_id);

drop policy if exists "user_shipping_addresses_insert_own" on public.user_shipping_addresses;
create policy "user_shipping_addresses_insert_own"
  on public.user_shipping_addresses for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_shipping_addresses_update_own" on public.user_shipping_addresses;
create policy "user_shipping_addresses_update_own"
  on public.user_shipping_addresses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_shipping_addresses_delete_own" on public.user_shipping_addresses;
create policy "user_shipping_addresses_delete_own"
  on public.user_shipping_addresses for delete
  using (auth.uid() = user_id);
