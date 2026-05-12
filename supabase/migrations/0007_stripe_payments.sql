-- Stripe payment metadata and idempotency for storefront checkout

alter table public.orders
  add column if not exists stripe_payment_intent_id text,
  add column if not exists billing_address jsonb,
  add column if not exists payment_metadata jsonb not null default '{}'::jsonb,
  add column if not exists idempotency_key text;

create unique index if not exists orders_stripe_payment_intent_id_uidx
  on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists orders_idempotency_key_uidx
  on public.orders (idempotency_key)
  where idempotency_key is not null;

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'paid', 'refunded', 'partial_refund', 'failed'));
