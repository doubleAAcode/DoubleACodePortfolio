create extension if not exists pgcrypto;

create table if not exists public.wa_message_events (
  id uuid primary key default gen_random_uuid(),
  business_id text,
  connection_id text,
  phone_number_id text,
  customer_phone_masked text,
  customer_phone_hash text,
  direction text not null check (direction in ('INBOUND', 'OUTBOUND', 'SYSTEM')),
  sender_type text not null check (sender_type in ('CUSTOMER', 'BOT', 'HUMAN', 'SYSTEM')),
  message_type text not null default 'unknown'
    check (message_type in ('text', 'button', 'list', 'template', 'image', 'audio', 'document', 'unknown')),
  body text,
  summary text,
  meta_message_id text,
  status text check (status in ('received', 'sent', 'failed', 'delivered', 'read', 'unknown')),
  error_code text,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wa_message_events_business_idx
  on public.wa_message_events (business_id);

create index if not exists wa_message_events_connection_idx
  on public.wa_message_events (connection_id);

create index if not exists wa_message_events_phone_number_idx
  on public.wa_message_events (phone_number_id);

create index if not exists wa_message_events_meta_message_idx
  on public.wa_message_events (meta_message_id);

create index if not exists wa_message_events_created_idx
  on public.wa_message_events (created_at desc);

create table if not exists public.wa_meta_templates (
  id uuid primary key default gen_random_uuid(),
  business_id text,
  connection_id text,
  waba_id text,
  name text not null,
  language text not null,
  category text not null,
  body text not null,
  meta_template_id text,
  status text,
  response_json jsonb,
  error_code text,
  error_message text,
  created_by_admin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wa_meta_templates_business_idx
  on public.wa_meta_templates (business_id);

create index if not exists wa_meta_templates_connection_idx
  on public.wa_meta_templates (connection_id);

create index if not exists wa_meta_templates_waba_idx
  on public.wa_meta_templates (waba_id);

create index if not exists wa_meta_templates_name_idx
  on public.wa_meta_templates (name);

create index if not exists wa_meta_templates_status_idx
  on public.wa_meta_templates (status);

create index if not exists wa_meta_templates_created_idx
  on public.wa_meta_templates (created_at desc);

alter table public.wa_message_events enable row level security;
alter table public.wa_meta_templates enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.wa_message_events to service_role;
grant select, insert, update, delete on public.wa_meta_templates to service_role;

-- No anon/auth policies are created on purpose.
-- Internal admin APIs read/write these tables only from server code using SUPABASE_SERVICE_ROLE_KEY.
