-- Service-role-only schema for the Double A desktop-app license switch.
-- Run once in the Supabase SQL editor. The browser never reads these tables: RLS is enabled with
-- no policies, so only the server routes (service role) can touch them.

create table if not exists public.license_global (
  id boolean primary key default true,
  stop_all boolean not null default false,
  message text not null default '',
  updated_at timestamptz not null default now(),
  constraint license_global_singleton_check check (id),
  constraint license_global_message_check check (char_length(message) <= 500)
);

insert into public.license_global (id) values (true)
on conflict (id) do nothing;

create table if not exists public.licenses (
  key text primary key,
  label text not null,
  status text not null default 'active',
  message text not null default '',
  max_machines integer not null default 1,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint licenses_key_check check (key ~ '^[A-Za-z0-9_-]{8,128}$'),
  constraint licenses_label_check check (char_length(label) between 1 and 120),
  constraint licenses_status_check check (status in ('active', 'suspended', 'revoked')),
  constraint licenses_message_check check (char_length(message) <= 500),
  constraint licenses_max_machines_check check (max_machines between 1 and 100)
);

create table if not exists public.license_machines (
  license_key text not null references public.licenses (key) on delete cascade,
  machine_id text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  app_version text not null default '',
  primary key (license_key, machine_id),
  constraint license_machines_machine_id_check check (machine_id ~ '^[a-f0-9]{16,64}$')
);

alter table public.license_global enable row level security;
alter table public.licenses enable row level security;
alter table public.license_machines enable row level security;

revoke all on table public.license_global from anon, authenticated;
revoke all on table public.licenses from anon, authenticated;
revoke all on table public.license_machines from anon, authenticated;

-- Atomic machine registration: the license row is locked so two computers checking in at the same
-- moment cannot both take the last free seat.
create or replace function public.license_register_machine(
  p_key text,
  p_machine_id text,
  p_app_version text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_max integer;
  v_count integer;
  v_version text := left(coalesce(p_app_version, ''), 32);
begin
  select max_machines into v_max
  from public.licenses
  where key = p_key
  for update;

  if not found then
    return false;
  end if;

  if exists (
    select 1 from public.license_machines
    where license_key = p_key and machine_id = p_machine_id
  ) then
    update public.license_machines
    set last_seen_at = now(), app_version = v_version
    where license_key = p_key and machine_id = p_machine_id;
    return true;
  end if;

  select count(*) into v_count
  from public.license_machines
  where license_key = p_key;

  if v_count >= v_max then
    return false;
  end if;

  insert into public.license_machines (license_key, machine_id, app_version)
  values (p_key, p_machine_id, v_version);

  return true;
end;
$$;

revoke all on function public.license_register_machine(text, text, text) from public, anon, authenticated;
grant execute on function public.license_register_machine(text, text, text) to service_role;
