-- Additive checkout repair: order-item snapshots, richer discount rules,
-- and the contact-form insert grant. Existing rows and prices are unchanged.

-- -----------------------------------------------------------------------------
-- Order line snapshots (name stays in title; size is its own field)
-- -----------------------------------------------------------------------------
alter table public.order_items
  add column if not exists size text,
  add column if not exists color_name text,
  add column if not exists line_total numeric(10, 2);

alter table public.orders
  add column if not exists stripe_checkout_session_id text;

-- -----------------------------------------------------------------------------
-- Discount rules. Percentage codes already in the table keep working.
-- allowed_emails exists in production from an out-of-band change; keep it.
-- -----------------------------------------------------------------------------
alter table public.discount_codes
  add column if not exists allowed_emails text[] not null default '{}';

alter table public.discount_codes
  add column if not exists discount_type text not null default 'percentage';

alter table public.discount_codes
  add column if not exists amount numeric(10, 2);

alter table public.discount_codes
  add column if not exists min_subtotal numeric(10, 2) not null default 0;

alter table public.discount_codes
  add column if not exists usage_limit integer;

alter table public.discount_codes
  add column if not exists usage_count integer not null default 0;

alter table public.discount_codes
  add column if not exists product_ids uuid[] not null default '{}';

alter table public.discount_codes
  alter column percentage drop not null;

alter table public.discount_codes drop constraint if exists discount_codes_percentage_check;
alter table public.discount_codes drop constraint if exists discount_codes_discount_type_check;
alter table public.discount_codes drop constraint if exists discount_codes_value_check;
alter table public.discount_codes drop constraint if exists discount_codes_usage_limit_check;
alter table public.discount_codes drop constraint if exists discount_codes_usage_count_check;
alter table public.discount_codes drop constraint if exists discount_codes_min_subtotal_check;

alter table public.discount_codes
  add constraint discount_codes_discount_type_check
  check (discount_type in ('percentage', 'fixed'));

alter table public.discount_codes
  add constraint discount_codes_value_check
  check (
    (discount_type = 'percentage' and percentage is not null and percentage > 0 and percentage <= 100)
    or (discount_type = 'fixed' and amount is not null and amount > 0)
  );

alter table public.discount_codes
  add constraint discount_codes_usage_limit_check
  check (usage_limit is null or usage_limit > 0);

alter table public.discount_codes
  add constraint discount_codes_usage_count_check
  check (usage_count >= 0);

alter table public.discount_codes
  add constraint discount_codes_min_subtotal_check
  check (min_subtotal >= 0);

-- Guests and signed-in customers can submit the contact form.
-- RLS still requires status = 'new'. Admins keep read/update/delete.
grant insert on table public.contact_messages to anon, authenticated;
