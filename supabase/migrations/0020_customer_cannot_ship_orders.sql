-- Customers may update their own unpaid or failed checkout rows, but they
-- cannot mark fulfillment shipped or delivered and cannot set a settled
-- payment status. Staff fulfillment stays on orders_admin_update.
-- Existing rows are unchanged.

drop policy if exists "orders_update_own_unpaid" on public.orders;

create policy "orders_update_own_unpaid"
  on public.orders
  for update
  using (
    (select auth.uid()) = user_id
    and payment_status in ('unpaid', 'failed')
    and status not in ('shipped', 'delivered')
  )
  with check (
    (select auth.uid()) = user_id
    and payment_status in ('unpaid', 'failed')
    and status not in ('shipped', 'delivered')
  );
