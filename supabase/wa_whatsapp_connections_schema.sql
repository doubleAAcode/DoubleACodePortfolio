-- WhatsApp connection metadata for multi-business routing with legacy-safe rollout.
-- Run after the existing core/catalog schema files.

create table if not exists public.wa_whatsapp_connections (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  phone_number_id text not null,
  business_account_id text,
  display_name text not null default 'WhatsApp connection',
  config_suffix text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phone_number_id),
  unique (business_id, phone_number_id),
  check (length(trim(id)) > 0),
  check (length(trim(business_id)) > 0),
  check (length(trim(phone_number_id)) > 0)
);

create index if not exists wa_whatsapp_connections_business_idx
  on public.wa_whatsapp_connections (business_id, is_active);

alter table public.wa_whatsapp_connections enable row level security;

grant select, insert, update, delete on public.wa_whatsapp_connections to service_role;

alter table public.wa_webhook_logs
  add column if not exists connection_id text,
  add column if not exists business_id text;

create index if not exists wa_webhook_logs_business_created_idx
  on public.wa_webhook_logs (business_id, created_at desc);

create index if not exists wa_webhook_logs_connection_created_idx
  on public.wa_webhook_logs (connection_id, created_at desc);

-- Existing single-business deployments do not need an immediate data migration.
-- If this table has no matching active row for an incoming phone_number_id,
-- server code falls back to the legacy WHATSAPP_* environment variables.
