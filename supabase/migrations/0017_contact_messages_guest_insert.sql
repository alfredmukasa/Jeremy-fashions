-- Allow guests (anon) and signed-in customers to submit contact messages.
-- Admin read/update/delete stays gated by public.is_admin().

grant insert on table public.contact_messages to anon, authenticated;
grant select, update, delete on table public.contact_messages to authenticated;

drop policy if exists "contact_messages_public_insert" on public.contact_messages;
create policy "contact_messages_public_insert"
  on public.contact_messages for insert
  to anon, authenticated
  with check (
    status = 'new'
    and (user_id is null or user_id = auth.uid())
  );
