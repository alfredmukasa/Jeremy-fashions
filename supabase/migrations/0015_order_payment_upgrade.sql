-- Payment/order upgrade: human-readable order numbers, dedicated money columns,
-- confirmation-email idempotency, and Stripe webhook event IDs.
-- Never stores PAN/CVV. Payment status stays distinct from fulfillment status.

alter table public.orders
  add column if not exists order_number text,
  add column if not exists subtotal_amount numeric(10, 2),
  add column if not exists shipping_amount numeric(10, 2),
  add column if not exists tax_amount numeric(10, 2),
  add column if not exists discount_amount numeric(10, 2) not null default 0,
  add column if not exists refund_amount numeric(10, 2) not null default 0,
  add column if not exists confirmation_email_sent_at timestamptz;

create unique index if not exists orders_order_number_uidx
  on public.orders (order_number)
  where order_number is not null;

update public.orders
set order_number = 'KN-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where order_number is null;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  order_id uuid references public.orders (id) on delete set null,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_order_id_idx
  on public.stripe_webhook_events (order_id);

alter table public.stripe_webhook_events enable row level security;

comment on table public.stripe_webhook_events is
  'Stripe event.id ledger for webhook idempotency. Service role only; no card data.';
