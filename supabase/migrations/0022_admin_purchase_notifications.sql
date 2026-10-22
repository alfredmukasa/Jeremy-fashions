-- Additive: no historical orders are emailed or changed. Only future transitions
-- to paid create an inbox entry. Email work runs outside the payment transaction.
begin;

create table public.admin_purchase_notifications (
  order_id uuid primary key references public.orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  email_payload jsonb,
  email_sent_at timestamptz,
  email_claimed_at timestamptz,
  email_last_error text
);
create index admin_purchase_notifications_created_idx
  on public.admin_purchase_notifications(created_at desc);

create table public.admin_purchase_notification_reads (
  order_id uuid not null references public.admin_purchase_notifications(order_id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (order_id, admin_id)
);

create or replace function public.can_read_purchase_notifications()
returns boolean language sql stable set search_path = '' as $$
  select public.is_admin() and coalesce(auth.jwt()->'app_metadata'->>'admin_role', 'SUPER_ADMIN')
    in ('SUPER_ADMIN', 'ORDER_MANAGER', 'SUPPORT_ADMIN');
$$;

alter table public.admin_purchase_notifications enable row level security;
alter table public.admin_purchase_notification_reads enable row level security;
revoke all on public.admin_purchase_notifications, public.admin_purchase_notification_reads from anon, authenticated;
grant select (order_id, created_at, email_sent_at, email_last_error) on public.admin_purchase_notifications to authenticated;
grant select, insert on public.admin_purchase_notification_reads to authenticated;
grant all on public.admin_purchase_notifications, public.admin_purchase_notification_reads to service_role;

create policy purchase_notifications_staff_read on public.admin_purchase_notifications for select to authenticated
  using (public.can_read_purchase_notifications());
create policy purchase_notification_reads_own on public.admin_purchase_notification_reads for select to authenticated
  using (admin_id = auth.uid() and public.can_read_purchase_notifications());
create policy purchase_notification_reads_insert_own on public.admin_purchase_notification_reads for insert to authenticated
  with check (admin_id = auth.uid() and public.can_read_purchase_notifications());

create function public.record_paid_purchase_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.payment_status = 'paid' then
    if tg_op = 'INSERT' then
      insert into public.admin_purchase_notifications(order_id) values (new.id) on conflict do nothing;
    elsif old.payment_status is distinct from 'paid' then
      insert into public.admin_purchase_notifications(order_id) values (new.id) on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;
create trigger orders_record_paid_purchase_notification after insert or update of payment_status on public.orders
  for each row execute function public.record_paid_purchase_notification();

-- Return one consistent snapshot, including an exact unread count beyond the
-- recent 20 entries. All order access still goes through the caller's order RLS.
create function public.admin_purchase_inbox()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'unreadCount', (select count(*) from public.admin_purchase_notifications n
      where not exists (select 1 from public.admin_purchase_notification_reads r where r.order_id = n.order_id and r.admin_id = auth.uid())),
    'items', coalesce((select jsonb_agg(row_to_json(recent) order by recent.is_read, recent.created_at desc, recent.order_id desc) from (
      select n.order_id, n.created_at, n.email_sent_at, n.email_last_error,
        o.order_number, o.total_amount, o.currency,
        exists(select 1 from public.admin_purchase_notification_reads r where r.order_id = n.order_id and r.admin_id = auth.uid()) as is_read
      from public.admin_purchase_notifications n join public.orders o on o.id = n.order_id
      order by is_read, n.created_at desc, n.order_id desc limit 20
    ) recent), '[]'::jsonb)
  );
$$;
revoke all on function public.admin_purchase_inbox() from public, anon;
grant execute on function public.admin_purchase_inbox() to authenticated;
revoke all on function public.record_paid_purchase_notification() from public, anon, authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.admin_purchase_notifications;
    alter publication supabase_realtime add table public.admin_purchase_notification_reads;
  end if;
end $$;
commit;
