-- Durable WhatsApp operations required by the Flow Manager Inbox, Contacts,
-- Team, and media-library screens.
--
-- Prerequisites:
--   wa_catalog_settings_schema.sql
--   wa_whatsapp_connections_schema.sql
--   wa_internal_admin_schema.sql
--   wa_flow_templates_schema.sql
--   wa_bot_core_schema.sql

begin;

create extension if not exists pgcrypto;

alter table public.wa_business_users
  add column if not exists display_name text,
  add column if not exists last_active_at timestamptz;

alter table public.wa_business_users
  drop constraint if exists wa_business_users_role_check;

alter table public.wa_business_users
  add constraint wa_business_users_role_check
  check (role in ('OWNER', 'MANAGER', 'STAFF', 'VIEWER'));

create unique index if not exists wa_business_users_business_id_id_uidx
  on public.wa_business_users (business_id, id);

create unique index if not exists wa_whatsapp_connections_business_id_id_uidx
  on public.wa_whatsapp_connections (business_id, id);

create table if not exists public.wa_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  phone_e164 text not null,
  phone_hash text generated always as (encode(digest(phone_e164, 'sha256'), 'hex')) stored,
  display_name text not null default '',
  lifecycle text not null default 'LEAD',
  language text,
  opt_in_status text not null default 'UNKNOWN',
  opt_in_source text,
  opt_in_at timestamptz,
  opt_out_at timestamptz,
  attributes jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone_e164),
  unique (business_id, id),
  check (length(trim(phone_e164)) >= 7),
  check (lifecycle in ('LEAD', 'CUSTOMER', 'VIP', 'CHURNED')),
  check (opt_in_status in ('UNKNOWN', 'OPTED_IN', 'OPTED_OUT')),
  check (language is null or language in ('en', 'ar')),
  check (jsonb_typeof(attributes) = 'object')
);

create index if not exists wa_contacts_business_last_seen_idx
  on public.wa_contacts (business_id, last_seen_at desc);

create index if not exists wa_contacts_business_lifecycle_idx
  on public.wa_contacts (business_id, lifecycle, last_seen_at desc);

create index if not exists wa_contacts_phone_hash_idx
  on public.wa_contacts (business_id, phone_hash);

create index if not exists wa_contacts_attributes_gin_idx
  on public.wa_contacts using gin (attributes);

create table if not exists public.wa_tags (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  name text not null,
  color text not null default 'gray',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  check (length(trim(name)) between 1 and 64),
  check (color in ('gray', 'blue', 'green', 'amber', 'red', 'violet', 'pink'))
);

create unique index if not exists wa_tags_business_name_uidx
  on public.wa_tags (business_id, lower(name));

create table if not exists public.wa_contact_tags (
  business_id text not null references public.wa_businesses(id) on delete cascade,
  contact_id uuid not null,
  tag_id uuid not null,
  assigned_by_user_id uuid,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id),
  foreign key (business_id, contact_id)
    references public.wa_contacts(business_id, id) on delete cascade,
  foreign key (business_id, tag_id)
    references public.wa_tags(business_id, id) on delete cascade,
  foreign key (business_id, assigned_by_user_id)
    references public.wa_business_users(business_id, id) on delete restrict
);

create index if not exists wa_contact_tags_business_tag_idx
  on public.wa_contact_tags (business_id, tag_id, created_at desc);

create table if not exists public.wa_media_assets (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  media_kind text not null,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  duration_ms integer,
  checksum_sha256 text,
  status text not null default 'UPLOADING',
  meta_media_id text,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (storage_bucket, storage_path),
  unique (business_id, id),
  foreign key (business_id, created_by_user_id)
    references public.wa_business_users(business_id, id) on delete restrict,
  check (media_kind in ('IMAGE', 'AUDIO', 'DOCUMENT')),
  check (status in ('UPLOADING', 'READY', 'FAILED', 'DELETED')),
  check (byte_size >= 0),
  check (duration_ms is null or duration_ms >= 0)
);

create index if not exists wa_media_assets_business_kind_idx
  on public.wa_media_assets (business_id, media_kind, created_at desc)
  where deleted_at is null;

create table if not exists public.wa_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  contact_id uuid not null,
  connection_id text,
  channel text not null default 'WHATSAPP',
  status text not null default 'OPEN',
  priority text not null default 'NORMAL',
  assignee_user_id uuid,
  unread_count integer not null default 0,
  last_message_preview text,
  last_message_at timestamptz,
  last_customer_message_at timestamptz,
  last_agent_message_at timestamptz,
  sla_due_at timestamptz,
  snoozed_until timestamptz,
  opened_at timestamptz not null default now(),
  pending_at timestamptz,
  closed_at timestamptz,
  business_flow_id text references public.wa_business_flows(id) on delete set null,
  flow_version_id text references public.wa_business_flow_versions(id) on delete set null,
  current_node_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, contact_id)
    references public.wa_contacts(business_id, id) on delete restrict,
  foreign key (business_id, connection_id)
    references public.wa_whatsapp_connections(business_id, id) on delete restrict,
  foreign key (business_id, assignee_user_id)
    references public.wa_business_users(business_id, id) on delete restrict,
  check (channel = 'WHATSAPP'),
  check (status in ('OPEN', 'PENDING', 'SNOOZED', 'CLOSED')),
  check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  check (unread_count >= 0)
);

create unique index if not exists wa_conversations_one_active_uidx
  on public.wa_conversations (
    business_id,
    contact_id,
    coalesce(connection_id, '')
  )
  where status in ('OPEN', 'PENDING', 'SNOOZED');

create index if not exists wa_conversations_inbox_idx
  on public.wa_conversations (business_id, status, last_message_at desc nulls last);

create index if not exists wa_conversations_assignee_idx
  on public.wa_conversations (business_id, assignee_user_id, status, last_message_at desc nulls last);

create index if not exists wa_conversations_contact_idx
  on public.wa_conversations (business_id, contact_id, created_at desc);

create table if not exists public.wa_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  conversation_id uuid not null,
  contact_id uuid not null,
  connection_id text,
  direction text not null,
  sender_type text not null,
  sender_user_id uuid,
  message_type text not null,
  body text,
  media_asset_id uuid,
  template_name text,
  reply_to_message_id uuid,
  meta_message_id text,
  status text not null,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, conversation_id)
    references public.wa_conversations(business_id, id) on delete cascade,
  foreign key (business_id, contact_id)
    references public.wa_contacts(business_id, id) on delete restrict,
  foreign key (business_id, connection_id)
    references public.wa_whatsapp_connections(business_id, id) on delete restrict,
  foreign key (business_id, sender_user_id)
    references public.wa_business_users(business_id, id) on delete restrict,
  foreign key (business_id, media_asset_id)
    references public.wa_media_assets(business_id, id) on delete restrict,
  foreign key (business_id, reply_to_message_id)
    references public.wa_conversation_messages(business_id, id) on delete restrict,
  check (direction in ('INBOUND', 'OUTBOUND', 'SYSTEM')),
  check (sender_type in ('CUSTOMER', 'BOT', 'HUMAN', 'SYSTEM')),
  check (message_type in (
    'TEXT',
    'IMAGE',
    'AUDIO',
    'DOCUMENT',
    'TEMPLATE',
    'INTERACTIVE',
    'SYSTEM'
  )),
  check (status in (
    'QUEUED',
    'SENDING',
    'SENT',
    'DELIVERED',
    'READ',
    'RECEIVED',
    'FAILED',
    'CANCELLED'
  )),
  check (jsonb_typeof(metadata) = 'object'),
  check (
    message_type = 'SYSTEM'
    or body is not null
    or media_asset_id is not null
    or template_name is not null
  )
);

create unique index if not exists wa_conversation_messages_meta_uidx
  on public.wa_conversation_messages (business_id, meta_message_id)
  where meta_message_id is not null;

create index if not exists wa_conversation_messages_timeline_idx
  on public.wa_conversation_messages (business_id, conversation_id, created_at asc);

create index if not exists wa_conversation_messages_status_idx
  on public.wa_conversation_messages (business_id, status, created_at asc)
  where status in ('QUEUED', 'SENDING', 'FAILED');

create table if not exists public.wa_conversation_events (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  conversation_id uuid not null,
  event_type text not null,
  actor_type text not null,
  actor_user_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (business_id, conversation_id)
    references public.wa_conversations(business_id, id) on delete cascade,
  foreign key (business_id, actor_user_id)
    references public.wa_business_users(business_id, id) on delete restrict,
  check (event_type in (
    'CREATED',
    'STATUS_CHANGED',
    'ASSIGNED',
    'TRANSFERRED',
    'SNOOZED',
    'REOPENED',
    'TAG_ADDED',
    'TAG_REMOVED',
    'NOTE_ADDED',
    'FLOW_STARTED',
    'FLOW_STOPPED'
  )),
  check (actor_type in ('CUSTOMER', 'USER', 'BOT', 'SYSTEM')),
  check (jsonb_typeof(payload) = 'object')
);

create index if not exists wa_conversation_events_timeline_idx
  on public.wa_conversation_events (business_id, conversation_id, created_at asc);

create table if not exists public.wa_canned_replies (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.wa_businesses(id) on delete cascade,
  title text not null,
  body text not null,
  shortcut text,
  category text,
  is_active boolean not null default true,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, created_by_user_id)
    references public.wa_business_users(business_id, id) on delete restrict,
  check (length(trim(title)) between 1 and 120),
  check (length(trim(body)) between 1 and 4000)
);

create unique index if not exists wa_canned_replies_shortcut_uidx
  on public.wa_canned_replies (business_id, lower(shortcut))
  where shortcut is not null and is_active;

create index if not exists wa_canned_replies_business_idx
  on public.wa_canned_replies (business_id, is_active, title);

alter table public.wa_customer_profiles
  add column if not exists contact_id uuid;

insert into public.wa_contacts (
  business_id,
  phone_e164,
  display_name,
  lifecycle,
  language,
  first_seen_at,
  last_seen_at,
  created_at,
  updated_at
)
select
  profile.business_id,
  profile.customer_phone,
  profile.customer_name,
  'CUSTOMER',
  profile.language,
  profile.created_at,
  profile.last_ordered_at,
  profile.created_at,
  profile.updated_at
from public.wa_customer_profiles as profile
on conflict (business_id, phone_e164) do update
set
  display_name = case
    when trim(excluded.display_name) <> '' then excluded.display_name
    else public.wa_contacts.display_name
  end,
  lifecycle = case
    when public.wa_contacts.lifecycle = 'LEAD' then 'CUSTOMER'
    else public.wa_contacts.lifecycle
  end,
  language = coalesce(excluded.language, public.wa_contacts.language),
  last_seen_at = greatest(public.wa_contacts.last_seen_at, excluded.last_seen_at),
  updated_at = greatest(public.wa_contacts.updated_at, excluded.updated_at);

update public.wa_customer_profiles as profile
set contact_id = contact.id
from public.wa_contacts as contact
where contact.business_id = profile.business_id
  and contact.phone_e164 = profile.customer_phone
  and profile.contact_id is distinct from contact.id;

do $$
begin
  alter table public.wa_customer_profiles
    add constraint wa_customer_profiles_business_contact_fk
    foreign key (business_id, contact_id)
    references public.wa_contacts(business_id, id)
    on delete restrict;
exception
  when duplicate_object then null;
end $$;

create or replace function public.wa_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wa_business_users_set_updated_at on public.wa_business_users;
create trigger wa_business_users_set_updated_at
before update on public.wa_business_users
for each row execute function public.wa_set_updated_at();

drop trigger if exists wa_contacts_set_updated_at on public.wa_contacts;
create trigger wa_contacts_set_updated_at
before update on public.wa_contacts
for each row execute function public.wa_set_updated_at();

drop trigger if exists wa_tags_set_updated_at on public.wa_tags;
create trigger wa_tags_set_updated_at
before update on public.wa_tags
for each row execute function public.wa_set_updated_at();

drop trigger if exists wa_media_assets_set_updated_at on public.wa_media_assets;
create trigger wa_media_assets_set_updated_at
before update on public.wa_media_assets
for each row execute function public.wa_set_updated_at();

drop trigger if exists wa_conversations_set_updated_at on public.wa_conversations;
create trigger wa_conversations_set_updated_at
before update on public.wa_conversations
for each row execute function public.wa_set_updated_at();

drop trigger if exists wa_canned_replies_set_updated_at on public.wa_canned_replies;
create trigger wa_canned_replies_set_updated_at
before update on public.wa_canned_replies
for each row execute function public.wa_set_updated_at();

alter table public.wa_contacts enable row level security;
alter table public.wa_tags enable row level security;
alter table public.wa_contact_tags enable row level security;
alter table public.wa_media_assets enable row level security;
alter table public.wa_conversations enable row level security;
alter table public.wa_conversation_messages enable row level security;
alter table public.wa_conversation_events enable row level security;
alter table public.wa_canned_replies enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.wa_contacts to service_role;
grant select, insert, update, delete on public.wa_tags to service_role;
grant select, insert, update, delete on public.wa_contact_tags to service_role;
grant select, insert, update, delete on public.wa_media_assets to service_role;
grant select, insert, update, delete on public.wa_conversations to service_role;
grant select, insert, update, delete on public.wa_conversation_messages to service_role;
grant select, insert, update, delete on public.wa_conversation_events to service_role;
grant select, insert, update, delete on public.wa_canned_replies to service_role;

-- Browser clients receive no direct policies. All tenant authorization remains
-- in server-only APIs using SUPABASE_SERVICE_ROLE_KEY.

commit;
