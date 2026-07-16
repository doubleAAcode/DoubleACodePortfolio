-- Owner-side notification settings, records, and reminder deduplication.
-- Run after the core WhatsApp order schema.

create extension if not exists pgcrypto;

create table if not exists public.wa_owner_notification_settings (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  enable_dashboard_alerts boolean not null default true,
  enable_sound boolean not null default true,
  enable_browser_push boolean not null default true,
  enable_email_alerts boolean not null default false,
  enable_whatsapp_alerts boolean not null default false,
  owner_email text,
  owner_whatsapp_number text,
  new_order_reminder_minutes integer not null default 5,
  second_reminder_minutes integer not null default 15,
  reminder_escalation_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id),
  check (new_order_reminder_minutes > 0),
  check (second_reminder_minutes > 0),
  check (second_reminder_minutes >= new_order_reminder_minutes)
);

create table if not exists public.wa_owner_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  type text not null,
  channel text not null,
  status text not null,
  recipient text,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  error_code text,
  error_message text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dedupe_key),
  unique (business_id, order_id, type, channel),
  check (type in (
    'NEW_ORDER',
    'ORDER_UNHANDLED_FIRST_REMINDER',
    'ORDER_UNHANDLED_SECOND_REMINDER',
    'ORDER_STATUS_CHANGED'
  )),
  check (channel in ('DASHBOARD', 'BROWSER', 'EMAIL', 'WHATSAPP_TEMPLATE')),
  check (status in (
    'PENDING',
    'SENT',
    'FAILED',
    'SKIPPED',
    'READ',
    'CANCELLED',
    'TEMPLATE_REQUIRED'
  )),
  check (length(trim(dedupe_key)) > 0)
);

create index if not exists wa_owner_notifications_business_created_idx
  on public.wa_owner_notifications (business_id, created_at desc);

create index if not exists wa_owner_notifications_business_unread_idx
  on public.wa_owner_notifications (business_id, read_at)
  where read_at is null;

create index if not exists wa_owner_notifications_order_idx
  on public.wa_owner_notifications (business_id, order_id, created_at desc);

alter table public.wa_owner_notification_settings enable row level security;
alter table public.wa_owner_notifications enable row level security;

grant select, insert, update, delete on public.wa_owner_notification_settings to service_role;
grant select, insert, update, delete on public.wa_owner_notifications to service_role;

-- No anon/auth policies are created. Dashboard API access is business-scoped
-- in server code and uses SUPABASE_SERVICE_ROLE_KEY.
