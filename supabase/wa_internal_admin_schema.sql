-- Internal Double A admin/manual onboarding support.
-- Run after catalog, order, connection, and owner notification schema files.

create extension if not exists pgcrypto;

alter table public.wa_businesses
  add column if not exists legal_name text,
  add column if not exists status text not null default 'ACTIVE',
  add column if not exists timezone text not null default 'Asia/Beirut',
  add column if not exists country text not null default 'LB',
  add column if not exists template_type text not null default 'ecommerce';

do $$
begin
  alter table public.wa_businesses
    add constraint wa_businesses_status_check
    check (status in ('DRAFT', 'SETUP_INCOMPLETE', 'ACTIVE', 'PAUSED', 'SUSPENDED', 'ERROR'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.wa_business_users (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  email text not null,
  role text not null default 'OWNER',
  status text not null default 'INVITED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, email),
  check (role in ('OWNER', 'MANAGER', 'STAFF')),
  check (status in ('INVITED', 'ACTIVE', 'REMOVED')),
  check (length(trim(email)) > 3)
);

create index if not exists wa_business_users_business_idx
  on public.wa_business_users (business_id, role, status);

alter table public.wa_whatsapp_connections
  add column if not exists provider text not null default 'META_CLOUD_API',
  add column if not exists display_phone_number text,
  add column if not exists display_name text,
  add column if not exists app_id text,
  add column if not exists status text not null default 'ACTIVE',
  add column if not exists webhook_path text,
  add column if not exists access_token_ref text,
  add column if not exists app_secret_ref text,
  add column if not exists verify_token_ref text,
  add column if not exists last_health_check_at timestamptz,
  add column if not exists last_health_status text;

do $$
begin
  alter table public.wa_whatsapp_connections
    add constraint wa_whatsapp_connections_status_check
    check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'DISCONNECTED', 'ERROR'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.wa_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id text not null,
  business_id text,
  action text not null,
  target_type text not null,
  target_id text,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists wa_admin_audit_logs_business_created_idx
  on public.wa_admin_audit_logs (business_id, created_at desc);

create index if not exists wa_admin_audit_logs_action_created_idx
  on public.wa_admin_audit_logs (action, created_at desc);

alter table public.wa_business_users enable row level security;
alter table public.wa_admin_audit_logs enable row level security;

grant select, insert, update, delete on public.wa_business_users to service_role;
grant select, insert on public.wa_admin_audit_logs to service_role;

-- Admin APIs are server-only and protected by Double A internal admin auth.
-- No anon/auth policies are created intentionally.
