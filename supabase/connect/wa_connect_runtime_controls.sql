-- Service-role-only rollout controls for Connect workers and provider sends.
-- The worker's raw bearer lives only in Vault. This schema stores its digest.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.wa_connect_runtime_flags (
  flag_key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint wa_connect_runtime_flags_key_check
    check (flag_key in ('HUMAN_SEND_ENABLED'))
);

create table if not exists public.wa_connect_worker_credentials (
  credential_key text primary key,
  secret_sha256 text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint wa_connect_worker_credentials_key_check
    check (credential_key = 'PRIMARY'),
  constraint wa_connect_worker_credentials_digest_check
    check (secret_sha256 ~ '^[0-9a-f]{64}$')
);

insert into public.wa_connect_runtime_flags (flag_key, enabled)
values ('HUMAN_SEND_ENABLED', false)
on conflict (flag_key) do nothing;

create or replace function public.wa_get_connect_runtime_flag(
  p_flag_key text
)
returns table (enabled boolean)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select flag.enabled
    from public.wa_connect_runtime_flags as flag
    where flag.flag_key = trim(p_flag_key)
  ), false);
$$;

create or replace function public.wa_verify_connect_worker_bearer(
  p_bearer text
)
returns table (authorized boolean)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select case
    when p_bearer is null or length(p_bearer) not between 32 and 512 then false
    else exists (
      select 1
      from public.wa_connect_worker_credentials as credential
      where credential.credential_key = 'PRIMARY'
        and credential.active
        and credential.secret_sha256 = encode(
          extensions.digest(convert_to(p_bearer, 'UTF8'), 'sha256'),
          'hex'
        )
    )
  end;
$$;

alter table public.wa_connect_runtime_flags enable row level security;
alter table public.wa_connect_worker_credentials enable row level security;

revoke all on table public.wa_connect_runtime_flags
  from public, anon, authenticated, service_role;
revoke all on table public.wa_connect_worker_credentials
  from public, anon, authenticated, service_role;

revoke all on function public.wa_get_connect_runtime_flag(text)
  from public, anon, authenticated;
grant execute on function public.wa_get_connect_runtime_flag(text)
  to service_role;

revoke all on function public.wa_verify_connect_worker_bearer(text)
  from public, anon, authenticated;
grant execute on function public.wa_verify_connect_worker_bearer(text)
  to service_role;
