-- =============================================================================
-- Admin team management + ownership transfer
--
-- Introduces a single-owner concept ("the main admin") on top of the existing
-- boolean is_admin() / app_metadata.role gate:
--   - profiles.is_admin / profiles.admin_role mirror auth.users.app_metadata
--     so the admin UI can list the current team without needing service-role
--     access from the client.
--   - profiles.is_owner marks exactly one profile as the current owner
--     (enforced by a partial unique index, not just application logic).
--   - public.admin_ownership_transfers records handoff requests: the owner
--     proposes a transfer to another registered user; that user accepts or
--     declines from their own account.
--
-- All privileged writes (granting admin, transferring ownership) go through
-- SECURITY DEFINER functions below rather than direct table RLS policies —
-- the "only the current owner may do this" / "only the addressee may accept
-- this" checks are easier to get right in one place than to express safely
-- as row-level policies for authenticated clients.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: mirror admin/owner status for fast, RLS-friendly reads
-- -----------------------------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists admin_role text;
alter table public.profiles add column if not exists is_owner boolean not null default false;

create index if not exists profiles_is_admin_idx on public.profiles (is_admin);

-- -----------------------------------------------------------------------------
-- Guard rail: "profiles_update_own_or_admin" lets a user update their OWN row
-- but has no column-level restriction, so without this trigger any signed-in
-- user could self-escalate by calling `.from('profiles').update({is_admin:
-- true, is_owner: true}).eq('id', myId)` directly — bypassing the functions
-- above entirely. This also closes the same pre-existing gap for
-- suspended/account_status (added in 0005), which had the identical issue.
--
-- Distinguishing "trusted write" from "plain client write" by role rather
-- than by the caller's current JWT claims matters because
-- admin_respond_ownership_transfer legitimately promotes the caller's own
-- row to is_admin/is_owner = true *before* their JWT has been refreshed to
-- reflect it — current_user is what changes (to the function owner) inside a
-- SECURITY DEFINER function body, regardless of the caller's live claims.
-- -----------------------------------------------------------------------------
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.admin_role := old.admin_role;
    new.is_owner := old.is_owner;
    new.suspended := old.suspended;
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_columns on public.profiles;
create trigger profiles_protect_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- At most one profile may be the current owner. Ordering in the functions
-- below (demote old owner, then promote new owner, as separate statements)
-- keeps this from ever being violated mid-transaction.
create unique index if not exists profiles_single_owner_idx on public.profiles (is_owner) where is_owner;

-- -----------------------------------------------------------------------------
-- Ownership transfer requests
-- -----------------------------------------------------------------------------
create table if not exists public.admin_ownership_transfers (
    id            uuid primary key default gen_random_uuid(),
    created_at    timestamptz not null default now(),
    responded_at  timestamptz,
    from_user_id  uuid not null references auth.users (id) on delete cascade,
    from_email    text not null,
    to_user_id    uuid not null references auth.users (id) on delete cascade,
    to_email      text not null,
    note          text,
    status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined', 'cancelled'))
);

create index if not exists admin_ownership_transfers_to_status_idx
  on public.admin_ownership_transfers (to_user_id, status);
create index if not exists admin_ownership_transfers_from_status_idx
  on public.admin_ownership_transfers (from_user_id, status);

alter table public.admin_ownership_transfers enable row level security;

-- Either party (or any admin, for oversight) may read a transfer. All writes
-- happen exclusively through the functions below.
drop policy if exists "admin_ownership_transfers_select_party" on public.admin_ownership_transfers;
create policy "admin_ownership_transfers_select_party"
  on public.admin_ownership_transfers for select
  using (to_user_id = auth.uid() or from_user_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- public.is_app_owner(uid) — internal helper, not exposed to clients directly
-- -----------------------------------------------------------------------------
create or replace function public.is_app_owner(target_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_owner from public.profiles where id = target_uid), false);
$$;

-- -----------------------------------------------------------------------------
-- public.admin_grant_admin_role(email, role) — owner adds a new admin
-- -----------------------------------------------------------------------------
create or replace function public.admin_grant_admin_role(target_email text, target_role text default 'SUPPORT_ADMIN')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  target_id uuid;
begin
  if not public.is_app_owner(caller_id) then
    raise exception 'Only the current owner can add admins.' using errcode = '42501';
  end if;

  if target_role not in ('SUPER_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER', 'SUPPORT_ADMIN') then
    raise exception 'Unknown admin role: %', target_role using errcode = '22023';
  end if;

  select id into target_id from auth.users where lower(email) = lower(trim(target_email));

  if target_id is null then
    raise exception 'No account found for %. Ask them to create an account first.', target_email
      using errcode = 'P0002';
  end if;

  if target_id = caller_id then
    raise exception 'You already have full access.' using errcode = '22023';
  end if;

  update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'admin', 'admin_role', target_role)
    where id = target_id;

  update public.profiles
    set is_admin = true, admin_role = target_role
    where id = target_id;

  select email into caller_email from auth.users where id = caller_id;

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, metadata)
  values (caller_id, caller_email, 'admin.grant', 'user', target_id::text,
          jsonb_build_object('email', target_email, 'role', target_role));

  return json_build_object('user_id', target_id, 'role', target_role);
end;
$$;

grant execute on function public.admin_grant_admin_role(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- public.admin_request_ownership_transfer(email, note) — owner initiates a
-- handoff; only one pending outgoing request is kept at a time.
-- -----------------------------------------------------------------------------
create or replace function public.admin_request_ownership_transfer(target_email text, note text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  target_id uuid;
  new_id uuid;
begin
  if not public.is_app_owner(caller_id) then
    raise exception 'Only the current owner can transfer control.' using errcode = '42501';
  end if;

  select id into target_id from auth.users where lower(email) = lower(trim(target_email));

  if target_id is null then
    raise exception 'No account found for %. Ask them to create an account first.', target_email
      using errcode = 'P0002';
  end if;

  if target_id = caller_id then
    raise exception 'You cannot transfer control to yourself.' using errcode = '22023';
  end if;

  select email into caller_email from auth.users where id = caller_id;

  update public.admin_ownership_transfers
    set status = 'cancelled', responded_at = now()
    where from_user_id = caller_id and status = 'pending';

  insert into public.admin_ownership_transfers (from_user_id, from_email, to_user_id, to_email, note, status)
  values (caller_id, caller_email, target_id, target_email, nullif(trim(coalesce(note, '')), ''), 'pending')
  returning id into new_id;

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, metadata)
  values (caller_id, caller_email, 'admin.transfer.request', 'admin_ownership_transfer', new_id::text,
          jsonb_build_object('to_email', target_email));

  return json_build_object('transfer_id', new_id);
end;
$$;

grant execute on function public.admin_request_ownership_transfer(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- public.admin_cancel_ownership_transfer(id) — owner rescinds their own
-- pending outgoing request.
-- -----------------------------------------------------------------------------
create or replace function public.admin_cancel_ownership_transfer(transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  update public.admin_ownership_transfers
    set status = 'cancelled', responded_at = now()
    where id = transfer_id and from_user_id = caller_id and status = 'pending';
end;
$$;

grant execute on function public.admin_cancel_ownership_transfer(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- public.admin_respond_ownership_transfer(id, accept) — the addressee accepts
-- or declines. Accepting grants them admin + SUPER_ADMIN + owner in one
-- transaction; the previous owner keeps their existing admin access (if any)
-- and simply stops being "the" owner.
-- -----------------------------------------------------------------------------
create or replace function public.admin_respond_ownership_transfer(transfer_id uuid, accept boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  xfer record;
begin
  select * into xfer from public.admin_ownership_transfers where id = transfer_id for update;

  if xfer is null then
    raise exception 'Transfer request not found.' using errcode = 'P0002';
  end if;

  if xfer.to_user_id <> caller_id then
    raise exception 'This transfer was not addressed to you.' using errcode = '42501';
  end if;

  if xfer.status <> 'pending' then
    raise exception 'This transfer request is no longer pending.' using errcode = '22023';
  end if;

  select email into caller_email from auth.users where id = caller_id;

  if accept then
    -- Demote the outgoing owner FIRST so the single-owner unique index never
    -- sees two rows with is_owner = true at the same time.
    update public.profiles set is_owner = false where id = xfer.from_user_id;
    update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_owner', false)
      where id = xfer.from_user_id;

    update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', 'admin', 'admin_role', 'SUPER_ADMIN', 'is_owner', true)
      where id = caller_id;

    update public.profiles
      set is_admin = true, admin_role = 'SUPER_ADMIN', is_owner = true
      where id = caller_id;

    update public.admin_ownership_transfers
      set status = 'accepted', responded_at = now()
      where id = transfer_id;

    insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, metadata)
    values (caller_id, caller_email, 'admin.transfer.accepted', 'admin_ownership_transfer', transfer_id::text,
            jsonb_build_object('from_user_id', xfer.from_user_id, 'from_email', xfer.from_email));
  else
    update public.admin_ownership_transfers
      set status = 'declined', responded_at = now()
      where id = transfer_id;

    insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, metadata)
    values (caller_id, caller_email, 'admin.transfer.declined', 'admin_ownership_transfer', transfer_id::text,
            jsonb_build_object('from_user_id', xfer.from_user_id, 'from_email', xfer.from_email));
  end if;

  return json_build_object('status', case when accept then 'accepted' else 'declined' end);
end;
$$;

grant execute on function public.admin_respond_ownership_transfer(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Seed: whoever currently holds app_metadata.role = 'admin' becomes the
-- initial owner (deterministically, the earliest such account — today that's
-- exactly one row, promoted in 0004_promote_alfred_mukasa_admin.sql).
-- -----------------------------------------------------------------------------
with current_owner as (
  select u.id, u.email
  from auth.users u
  where (u.raw_app_meta_data ->> 'role') = 'admin'
  order by u.created_at asc
  limit 1
)
update public.profiles p
set is_admin = true,
    admin_role = 'SUPER_ADMIN',
    is_owner = true
from current_owner
where p.id = current_owner.id;

with current_owner as (
  select u.id
  from auth.users u
  where (u.raw_app_meta_data ->> 'role') = 'admin'
  order by u.created_at asc
  limit 1
)
update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin', 'admin_role', 'SUPER_ADMIN', 'is_owner', true)
from current_owner
where u.id = current_owner.id;

-- Any other pre-existing admins (none today, but stay defensive): mirror
-- is_admin/admin_role onto profiles without granting ownership.
update public.profiles p
set is_admin = true,
    admin_role = coalesce(nullif(u.raw_app_meta_data ->> 'admin_role', ''), 'SUPER_ADMIN')
from auth.users u
where p.id = u.id
  and (u.raw_app_meta_data ->> 'role') = 'admin'
  and p.is_owner is distinct from true
  and p.is_admin is distinct from true;
