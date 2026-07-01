create extension if not exists pgcrypto;

create table if not exists public.wa_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  method text not null,
  path text not null,
  query jsonb not null default '{}'::jsonb,
  status integer not null,
  source text not null default 'meta_whatsapp',
  host text,
  user_agent text,
  message_count integer not null default 0,
  duplicate_count integer not null default 0,
  message_ids text[] not null default '{}'::text[],
  sender_mask text,
  phone_number_id text,
  input_types text[] not null default '{}'::text[],
  result text not null,
  error_summary text
);

create index if not exists wa_webhook_logs_created_at_idx
  on public.wa_webhook_logs (created_at desc);

alter table public.wa_webhook_logs enable row level security;

-- No anon/auth policies are created on purpose.
-- The app reads/writes this table only from server code using SUPABASE_SERVICE_ROLE_KEY.
