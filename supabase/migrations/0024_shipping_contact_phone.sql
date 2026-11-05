-- Nullable for existing addresses; checkout requires a phone for all new purchases.
-- Order contact numbers are snapshots in orders.shipping_address JSONB (key: phone).
begin;
alter table public.user_shipping_addresses add column if not exists phone text;
alter table public.user_shipping_addresses
  add constraint user_shipping_addresses_phone_format check (
    phone is null or (
      length(phone) <= 40
      and phone ~ '^\+?[0-9 () .-]+$'
      and length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15
    )
  );
comment on column public.user_shipping_addresses.phone is
  'Delivery contact number, including country code. NULL for legacy addresses.';
notify pgrst, 'reload schema';
commit;
