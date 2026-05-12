-- Stripe-driven payment lifecycle (processing + webhook activity metadata)

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'processing', 'paid', 'refunded', 'partial_refund', 'failed'));
