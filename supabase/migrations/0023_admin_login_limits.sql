-- Rate-limit only the website's admin password endpoint. Customer auth is unchanged.
begin;
create table public.admin_login_limits (
  bucket_key text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);
create index admin_login_limits_expiry_idx on public.admin_login_limits(expires_at);
alter table public.admin_login_limits enable row level security;
revoke all on public.admin_login_limits from public, anon, authenticated;
grant all on public.admin_login_limits to service_role;

create function public.claim_admin_login_attempt(p_ip_key text, p_identity_key text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_key text;
  v_attempts integer;
  v_expires timestamptz;
  v_allowed boolean := true;
  v_retry integer := 0;
  v_remaining integer := 0;
  v_limit integer;
begin
  if p_ip_key !~ '^[a-f0-9]{64}$' or p_identity_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid login bucket';
  end if;
  delete from public.admin_login_limits where expires_at < now() - interval '1 day';
  foreach v_key in array array['ip:' || p_ip_key, 'identity:' || p_identity_key] loop
    v_limit := case when v_key like 'ip:%' then 20 else 5 end;
    insert into public.admin_login_limits as existing(bucket_key, attempts, expires_at)
      values(v_key, 1, now() + interval '15 minutes')
      on conflict(bucket_key) do update set
        attempts = case when existing.expires_at <= now() then 1 else least(existing.attempts + 1, 21) end,
        expires_at = case when existing.expires_at <= now() then now() + interval '15 minutes' else existing.expires_at end
      returning attempts, expires_at into v_attempts, v_expires;
    if v_attempts > v_limit then v_allowed := false; end if;
    if v_attempts >= v_limit then
      v_retry := greatest(v_retry, ceil(extract(epoch from (v_expires - now())))::integer);
    end if;
    if v_limit = 5 then v_remaining := greatest(0, 5 - v_attempts); end if;
  end loop;
  return jsonb_build_object('allowed', v_allowed, 'retryAfterSeconds', v_retry, 'attemptsRemaining', v_remaining);
end;
$$;
revoke all on function public.claim_admin_login_attempt(text, text) from public, anon, authenticated;
grant execute on function public.claim_admin_login_attempt(text, text) to service_role;
commit;
