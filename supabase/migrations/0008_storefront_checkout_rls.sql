-- Allow signed-in customers to create checkout orders and attach payment intents

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert
  with check (auth.uid() = user_id and payment_status = 'unpaid');

drop policy if exists "orders_update_own_unpaid" on public.orders;
create policy "orders_update_own_unpaid"
  on public.orders for update
  using (auth.uid() = user_id and payment_status in ('unpaid', 'failed'))
  with check (auth.uid() = user_id);

drop policy if exists "order_items_insert_own_order" on public.order_items;
create policy "order_items_insert_own_order"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_items_delete_own_unpaid_order" on public.order_items;
create policy "order_items_delete_own_unpaid_order"
  on public.order_items for delete
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid() and o.payment_status = 'unpaid'
    )
  );
