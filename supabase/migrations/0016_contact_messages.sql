-- =============================================================================
-- Contact / support messages from the public Contact Us form
-- Storefront may insert; only admins may read, update, or delete.
-- =============================================================================

create table if not exists public.contact_messages (
    id           uuid primary key default gen_random_uuid(),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    first_name   text not null,
    last_name    text not null,
    email        text not null,
    message      text not null,
    status       text not null default 'new'
                   check (status in ('new', 'read', 'replied', 'archived')),
    user_id      uuid references auth.users (id) on delete set null,
    constraint contact_messages_first_name_len check (char_length(trim(first_name)) between 1 and 80),
    constraint contact_messages_last_name_len check (char_length(trim(last_name)) between 1 and 80),
    constraint contact_messages_email_len check (char_length(trim(email)) between 3 and 254),
    constraint contact_messages_message_len check (char_length(trim(message)) between 10 and 4000)
);

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_status_idx on public.contact_messages (status);
create index if not exists contact_messages_email_lower_idx on public.contact_messages (lower(email));
create index if not exists contact_messages_user_id_idx on public.contact_messages (user_id);

create or replace function public.set_contact_messages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contact_messages_set_updated_at on public.contact_messages;
create trigger contact_messages_set_updated_at
  before update on public.contact_messages
  for each row execute function public.set_contact_messages_updated_at();

alter table public.contact_messages enable row level security;

-- Anyone can submit a new support message. Status must stay 'new'.
-- user_id is optional and may only be the signed-in user (or null for guests).
drop policy if exists "contact_messages_public_insert" on public.contact_messages;
create policy "contact_messages_public_insert"
  on public.contact_messages for insert
  with check (
    status = 'new'
    and (user_id is null or user_id = auth.uid())
  );

-- No public reads of other people's (or anyone's) messages.
drop policy if exists "contact_messages_no_public_select" on public.contact_messages;
create policy "contact_messages_no_public_select"
  on public.contact_messages for select
  using (false);

drop policy if exists "contact_messages_admin_select" on public.contact_messages;
create policy "contact_messages_admin_select"
  on public.contact_messages for select
  using (public.is_admin());

drop policy if exists "contact_messages_admin_update" on public.contact_messages;
create policy "contact_messages_admin_update"
  on public.contact_messages for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "contact_messages_admin_delete" on public.contact_messages;
create policy "contact_messages_admin_delete"
  on public.contact_messages for delete
  using (public.is_admin());
