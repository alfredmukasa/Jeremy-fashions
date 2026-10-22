import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

test('purchase notification migration: paid-only, no backfill, per-admin reads and database permissions', async () => {
  const db = new PGlite()
  const adminA = '00000000-0000-0000-0000-000000000001'
  const adminB = '00000000-0000-0000-0000-000000000002'
  const order = '10000000-0000-0000-0000-000000000001'
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; grant usage on schema auth to anon, authenticated, service_role;
      create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
      create function public.is_admin() returns boolean language sql stable as $$ select coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin' $$;
      create table public.orders(id uuid primary key, payment_status text, order_number text, total_amount numeric, currency text);
      grant select on public.orders to authenticated;
      alter table public.orders enable row level security;
      create policy staff on public.orders for select to authenticated using(public.is_admin());
      insert into auth.users values ('${adminA}'), ('${adminB}');
      insert into public.orders values ('20000000-0000-0000-0000-000000000001', 'paid', 'OLD', 12, 'CAD');
    `)
    await db.exec(
      await readFile(
        new URL(
          '../supabase/migrations/0022_admin_purchase_notifications.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    )
    assert.equal(
      (await db.query('select * from admin_purchase_notifications')).rows
        .length,
      0,
      'historical payments are not emailed',
    )
    await db.exec(
      `insert into orders values ('${order}', 'unpaid', 'KN-TEST', 123.45, 'CAD')`,
    )
    for (const status of ['processing', 'failed', 'unpaid']) {
      await db.exec(
        `update orders set payment_status='${status}' where id='${order}'`,
      )
      assert.equal(
        (await db.query('select * from admin_purchase_notifications')).rows
          .length,
        0,
      )
    }
    await db.exec(`update orders set payment_status='paid' where id='${order}'`)
    await db.exec(`update orders set payment_status='paid' where id='${order}'`)
    assert.equal(
      (await db.query('select * from admin_purchase_notifications')).rows
        .length,
      1,
      'payment retries create one notice',
    )
    const asUser = async (id: string, role: string, staff = true) => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({
          sub: id,
          app_metadata: {
            role: staff ? 'admin' : 'customer',
            admin_role: role,
          },
        }),
      ])
      await db.exec('set role authenticated')
    }
    const inbox = async () =>
      (
        await db.query<{
          data: { unreadCount: number; items: Array<{ is_read: boolean }> }
        }>('select admin_purchase_inbox() as data')
      ).rows[0].data
    await asUser(adminA, 'SUPER_ADMIN')
    assert.equal((await inbox()).unreadCount, 1)
    await assert.rejects(
      db.query('select email_payload from admin_purchase_notifications'),
      /permission denied/,
    )
    await assert.rejects(
      db.query(`update admin_purchase_notifications set email_sent_at=now()`),
      /permission denied/,
    )
    await db.query(
      'insert into admin_purchase_notification_reads(order_id, admin_id) values ($1,$2) on conflict do nothing',
      [order, adminA],
    )
    await db.query(
      'insert into admin_purchase_notification_reads(order_id, admin_id) values ($1,$2) on conflict do nothing',
      [order, adminA],
    )
    assert.equal((await inbox()).unreadCount, 0)
    assert.equal((await inbox()).items[0].is_read, true)
    await assert.rejects(
      db.query(
        'insert into admin_purchase_notification_reads(order_id, admin_id) values ($1,$2)',
        [order, adminB],
      ),
      /row-level security/,
    )
    await asUser(adminB, 'ORDER_MANAGER')
    assert.equal(
      (await inbox()).unreadCount,
      1,
      'one admin reading does not dismiss another admin’s alert',
    )
    await asUser(adminB, 'PRODUCT_MANAGER')
    assert.equal((await inbox()).unreadCount, 0)
    assert.deepEqual((await inbox()).items, [])
    await asUser(adminB, 'SUPER_ADMIN', false)
    assert.deepEqual((await inbox()).items, [])
    await db.exec('reset role; set role anon')
    await assert.rejects(
      db.query('select order_id from admin_purchase_notifications'),
      /permission denied/,
    )
    await assert.rejects(
      db.query('select admin_purchase_inbox()'),
      /permission denied/,
    )
    await db.exec('reset role')
    await db.exec(
      `insert into orders select gen_random_uuid(), 'paid', 'KN-MANY', 5, 'CAD' from generate_series(1,25)`,
    )
    await asUser(adminB, 'SUPPORT_ADMIN')
    assert.equal(
      (await inbox()).unreadCount,
      26,
      'count includes notifications outside the recent 20',
    )
    assert.equal((await inbox()).items.length, 20)
    await asUser(adminA, 'SUPER_ADMIN')
    assert.equal((await inbox()).unreadCount, 25)
    assert.ok(
      (await inbox()).items.every((item) => !item.is_read),
      'unread entries stay reachable ahead of read history',
    )
  } finally {
    await db.close()
  }
})
