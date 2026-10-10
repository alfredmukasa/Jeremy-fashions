-- Checkout integrity, atomic stock/discount updates, guest-order claim,
-- tighter customer order-item writes, admin write RBAC, and safer grants.
-- Additive: existing rows and charged amounts are unchanged.

-- -----------------------------------------------------------------------------
-- Optional per-size stock map. Empty object keeps product-level stock only.
-- -----------------------------------------------------------------------------
alter table public.products
  add column if not exists stock_by_size jsonb not null default '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- Atomic stock helpers (service role / SECURITY DEFINER)
-- -----------------------------------------------------------------------------
create or replace function public.decrement_product_stock(
  p_product_id uuid,
  p_quantity integer,
  p_size text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stock integer;
  requested_size text := nullif(trim(coalesce(p_size, '')), '');
  resolved_size text;
  size_stock integer;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;

  update public.products
     set stock_quantity = stock_quantity - p_quantity
   where id = p_product_id
     and stock_quantity >= p_quantity
  returning stock_quantity into new_stock;

  if not found then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

  if requested_size is not null then
    select kv.key, (kv.value)::integer
      into resolved_size, size_stock
      from public.products p
      cross join lateral jsonb_each_text(coalesce(p.stock_by_size, '{}'::jsonb)) as kv(key, value)
     where p.id = p_product_id
       and lower(kv.key) = lower(requested_size)
     limit 1;

    if size_stock is not null then
      if size_stock < p_quantity then
        raise exception 'INSUFFICIENT_SIZE_STOCK' using errcode = 'P0001';
      end if;

      update public.products
         set stock_by_size = jsonb_set(
           coalesce(stock_by_size, '{}'::jsonb),
           array[resolved_size],
           to_jsonb(size_stock - p_quantity)
         )
       where id = p_product_id;
    end if;
  end if;

  return new_stock;
end;
$$;

create or replace function public.increment_product_stock(
  p_product_id uuid,
  p_quantity integer,
  p_size text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stock integer;
  requested_size text := nullif(trim(coalesce(p_size, '')), '');
  resolved_size text;
  size_stock integer;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;

  update public.products
     set stock_quantity = stock_quantity + p_quantity
   where id = p_product_id
  returning stock_quantity into new_stock;

  if not found then
    return 0;
  end if;

  if requested_size is not null then
    select kv.key, (kv.value)::integer
      into resolved_size, size_stock
      from public.products p
      cross join lateral jsonb_each_text(coalesce(p.stock_by_size, '{}'::jsonb)) as kv(key, value)
     where p.id = p_product_id
       and lower(kv.key) = lower(requested_size)
     limit 1;

    if size_stock is not null then
      update public.products
         set stock_by_size = jsonb_set(
           coalesce(stock_by_size, '{}'::jsonb),
           array[resolved_size],
           to_jsonb(size_stock + p_quantity)
         )
       where id = p_product_id;
    end if;
  end if;

  return new_stock;
end;
$$;

revoke all on function public.decrement_product_stock(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.increment_product_stock(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.decrement_product_stock(uuid, integer, text) to service_role;
grant execute on function public.increment_product_stock(uuid, integer, text) to service_role;

-- -----------------------------------------------------------------------------
-- Atomic discount redemption
-- -----------------------------------------------------------------------------
create or replace function public.increment_discount_usage(p_code_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update public.discount_codes
     set usage_count = usage_count + 1
   where id = p_code_id
     and (usage_limit is null or usage_count < usage_limit)
  returning id into updated_id;

  return updated_id is not null;
end;
$$;

revoke all on function public.increment_discount_usage(uuid) from public, anon, authenticated;
grant execute on function public.increment_discount_usage(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Attach guest orders to the signed-in account with the same email
-- -----------------------------------------------------------------------------
create or replace function public.claim_guest_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text;
  confirmed_at timestamptz;
  n integer := 0;
begin
  if uid is null then
    return 0;
  end if;

  select lower(email), email_confirmed_at
    into user_email, confirmed_at
    from auth.users
   where id = uid;
  if user_email is null or user_email = '' or confirmed_at is null then
    return 0;
  end if;

  update public.orders
     set user_id = uid,
         updated_at = now()
   where user_id is null
     and lower(email) = user_email;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.claim_guest_orders() from public, anon;
grant execute on function public.claim_guest_orders() to authenticated;

create or replace function public.account_is_blocked()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  flag boolean := false;
begin
  if uid is null then
    return false;
  end if;

  select (suspended is true or account_status in ('suspended', 'banned'))
    into flag
    from public.profiles
    where id = uid;

  return coalesce(flag, false);
end;
$$;

revoke all on function public.account_is_blocked() from public, anon;
grant execute on function public.account_is_blocked() to authenticated;

-- -----------------------------------------------------------------------------
-- Customers may only write line items on their unpaid/failed checkouts
-- -----------------------------------------------------------------------------
drop policy if exists "order_items_insert_own_order" on public.order_items;
create policy "order_items_insert_own_order"
  on public.order_items
  for insert
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = (select auth.uid())
        and o.payment_status in ('unpaid', 'failed')
        and o.status not in ('shipped', 'delivered')
    )
  );

drop policy if exists "order_items_delete_own_unpaid_order" on public.order_items;
create policy "order_items_delete_own_unpaid_order"
  on public.order_items
  for delete
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = (select auth.uid())
        and o.payment_status in ('unpaid', 'failed')
        and o.status not in ('shipped', 'delivered')
    )
  );

-- -----------------------------------------------------------------------------
-- Admin write RBAC (JWT admin_role). SELECT for staff stays on is_admin().
-- -----------------------------------------------------------------------------
create or replace function public.admin_has_permission(required_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  jwt_role text;
  admin_role text;
begin
  jwt_role := coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '');
  if jwt_role <> 'admin' then
    return false;
  end if;

  admin_role := coalesce((auth.jwt() -> 'app_metadata' ->> 'admin_role'), 'SUPER_ADMIN');

  if admin_role = 'SUPER_ADMIN' then
    return true;
  end if;

  if required_permission = 'dashboard.view' then
    return admin_role in ('PRODUCT_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER', 'SUPPORT_ADMIN');
  end if;
  if required_permission in ('products.manage', 'categories.manage') then
    return admin_role in ('PRODUCT_MANAGER', 'CONTENT_MANAGER');
  end if;
  if required_permission = 'discounts.manage' then
    return admin_role = 'PRODUCT_MANAGER';
  end if;
  if required_permission = 'orders.manage' then
    return admin_role in ('ORDER_MANAGER', 'SUPPORT_ADMIN');
  end if;
  if required_permission = 'messages.manage' then
    return admin_role in ('ORDER_MANAGER', 'SUPPORT_ADMIN');
  end if;
  if required_permission = 'waitlist.manage' then
    return admin_role = 'SUPPORT_ADMIN';
  end if;
  if required_permission = 'users.manage' then
    return admin_role = 'SUPPORT_ADMIN';
  end if;
  if required_permission = 'site_content.manage' then
    return admin_role = 'CONTENT_MANAGER';
  end if;
  if required_permission in ('settings.manage', 'security.view', 'admins.manage') then
    return false;
  end if;

  return false;
end;
$$;

revoke all on function public.admin_has_permission(text) from public, anon;
grant execute on function public.admin_has_permission(text) to authenticated;

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert"
  on public.products for insert
  with check (public.admin_has_permission('products.manage'));

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update"
  on public.products for update
  using (public.admin_has_permission('products.manage'));

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete"
  on public.products for delete
  using (public.admin_has_permission('products.manage'));

drop policy if exists "categories_admin_insert" on public.categories;
create policy "categories_admin_insert"
  on public.categories for insert
  with check (public.admin_has_permission('categories.manage'));

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update"
  on public.categories for update
  using (public.admin_has_permission('categories.manage'));

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete"
  on public.categories for delete
  using (public.admin_has_permission('categories.manage'));

drop policy if exists "waitlist_admin_update" on public.waitlist;
create policy "waitlist_admin_update"
  on public.waitlist for update
  using (public.admin_has_permission('waitlist.manage'));

drop policy if exists "waitlist_admin_delete" on public.waitlist;
create policy "waitlist_admin_delete"
  on public.waitlist for delete
  using (public.admin_has_permission('waitlist.manage'));

drop policy if exists "discount_codes_admin_insert" on public.discount_codes;
create policy "discount_codes_admin_insert"
  on public.discount_codes for insert
  with check (public.admin_has_permission('discounts.manage'));

drop policy if exists "discount_codes_admin_update" on public.discount_codes;
create policy "discount_codes_admin_update"
  on public.discount_codes for update
  using (public.admin_has_permission('discounts.manage'));

drop policy if exists "discount_codes_admin_delete" on public.discount_codes;
create policy "discount_codes_admin_delete"
  on public.discount_codes for delete
  using (public.admin_has_permission('discounts.manage'));

drop policy if exists "orders_admin_insert" on public.orders;
create policy "orders_admin_insert"
  on public.orders for insert
  with check (public.admin_has_permission('orders.manage'));

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
  on public.orders for update
  using (public.admin_has_permission('orders.manage'));

drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete"
  on public.orders for delete
  using (public.admin_has_permission('orders.manage'));

drop policy if exists "order_items_admin_write" on public.order_items;
create policy "order_items_admin_write"
  on public.order_items for all
  using (public.admin_has_permission('orders.manage'))
  with check (public.admin_has_permission('orders.manage'));

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write"
  on public.site_settings for all
  using (public.admin_has_permission('settings.manage'))
  with check (public.admin_has_permission('settings.manage'));

drop policy if exists "global_settings_admin_update" on public.global_settings;
create policy "global_settings_admin_update"
  on public.global_settings for update
  using (public.admin_has_permission('settings.manage'))
  with check (public.admin_has_permission('settings.manage'));

drop policy if exists "contact_messages_admin_update" on public.contact_messages;
create policy "contact_messages_admin_update"
  on public.contact_messages for update
  using (public.admin_has_permission('messages.manage'))
  with check (public.admin_has_permission('messages.manage'));

drop policy if exists "contact_messages_admin_delete" on public.contact_messages;
create policy "contact_messages_admin_delete"
  on public.contact_messages for delete
  using (public.admin_has_permission('messages.manage'));

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
  on public.audit_logs for select
  using (public.admin_has_permission('security.view') or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_admin_update"
  on public.profiles for update
  using (public.admin_has_permission('users.manage'))
  with check (public.admin_has_permission('users.manage'));

-- -----------------------------------------------------------------------------
-- Search path + tighter EXECUTE grants on privileged functions
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin';
$$;

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.admin_role := old.admin_role;
    new.is_owner := old.is_owner;
    new.suspended := old.suspended;
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;

create or replace function public.sync_user_shipping_address_default()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.user_shipping_addresses
      where user_id = new.user_id and id <> new.id
    ) then
      new.is_default := true;
    elsif new.is_default then
      update public.user_shipping_addresses
         set is_default = false, updated_at = now()
       where user_id = new.user_id and id <> new.id;
    end if;
    new.updated_at := now();
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.is_default and not old.is_default then
      update public.user_shipping_addresses
         set is_default = false, updated_at = now()
       where user_id = new.user_id and id <> new.id;
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
set search_path = public
as $$
begin
  if old.is_default then
    update public.user_shipping_addresses
       set is_default = true, updated_at = now()
     where id = (
       select id from public.user_shipping_addresses
        where user_id = old.user_id
        order by created_at asc
        limit 1
     );
  end if;
  return old;
end;
$$;

revoke all on function public.admin_grant_admin_role(text, text) from public, anon;
grant execute on function public.admin_grant_admin_role(text, text) to authenticated;

revoke all on function public.admin_request_ownership_transfer(text, text) from public, anon;
grant execute on function public.admin_request_ownership_transfer(text, text) to authenticated;

revoke all on function public.admin_cancel_ownership_transfer(uuid) from public, anon;
grant execute on function public.admin_cancel_ownership_transfer(uuid) to authenticated;

revoke all on function public.admin_respond_ownership_transfer(uuid, boolean) from public, anon;
grant execute on function public.admin_respond_ownership_transfer(uuid, boolean) to authenticated;

revoke all on function public.is_app_owner(uuid) from public, anon;
grant execute on function public.is_app_owner(uuid) to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
