-- Strip anonymous table privileges that only exist because of default grants.
-- RLS already blocks most writes; this also hides staff/customer tables from
-- the public GraphQL schema and removes anon INSERT/UPDATE/DELETE/TRUNCATE.
-- Authenticated grants stay so signed-in customers and staff can use RLS.

revoke all on table public.admin_ownership_transfers from anon, public;
revoke all on table public.audit_logs from anon, public;
revoke all on table public.discount_codes from anon, public;
revoke all on table public.orders from anon, public;
revoke all on table public.order_items from anon, public;
revoke all on table public.profiles from anon, public;
revoke all on table public.user_shipping_addresses from anon, public;
revoke all on table public.contact_messages from anon, public;
revoke all on table public.waitlist from anon, public;
revoke all on table public.products from anon, public;
revoke all on table public.categories from anon, public;
revoke all on table public.site_settings from anon, public;
revoke all on table public.global_settings from anon, public;
revoke all on table public.stripe_webhook_events from anon, authenticated, public;

grant select on table public.products to anon;
grant select on table public.categories to anon;
grant select on table public.site_settings to anon;
grant select on table public.global_settings to anon;
grant insert on table public.waitlist to anon;
grant insert on table public.contact_messages to anon;
grant all on table public.stripe_webhook_events to service_role;

revoke truncate on all tables in schema public from anon, authenticated;

drop policy if exists "stripe_webhook_events_no_client" on public.stripe_webhook_events;
create policy "stripe_webhook_events_no_client"
  on public.stripe_webhook_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table public.products is
  'Public catalog. Anon SELECT is intentional for the storefront.';
comment on table public.categories is
  'Public catalog. Anon SELECT is intentional for the storefront.';
comment on table public.site_settings is
  'Published site content. Anon SELECT is intentional for the storefront.';
comment on table public.global_settings is
  'Waitlist mode and store flags. Anon SELECT is intentional for the storefront.';
