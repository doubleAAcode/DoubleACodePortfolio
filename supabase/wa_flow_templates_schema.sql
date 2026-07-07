create extension if not exists pgcrypto;

create table if not exists public.wa_flow_templates (
  id text primary key,
  name text not null,
  description text,
  category text not null,
  status text not null default 'DRAFT',
  created_by_admin_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  check (category in ('STANDARD_ONLINE_STORE', 'JEWELRY', 'CLOTHING', 'ACCESSORIES', 'CUSTOM_PRODUCTS'))
);

create table if not exists public.wa_flow_template_versions (
  id text primary key,
  template_id text not null references public.wa_flow_templates(id) on delete cascade,
  version_number integer not null,
  status text not null default 'DRAFT',
  flow_json jsonb not null,
  validation_result jsonb not null default '{}'::jsonb,
  created_by_admin_user_id text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (template_id, version_number),
  check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

create table if not exists public.wa_business_flows (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  source_template_id text references public.wa_flow_templates(id),
  name text not null,
  status text not null default 'DRAFT',
  active_version_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id),
  check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

create table if not exists public.wa_business_flow_versions (
  id text primary key,
  business_flow_id text not null references public.wa_business_flows(id) on delete cascade,
  version_number integer not null,
  status text not null default 'DRAFT',
  flow_json jsonb not null,
  validation_result jsonb not null default '{}'::jsonb,
  created_by_user_id text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_flow_id, version_number),
  check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

alter table public.wa_business_flows
  drop constraint if exists wa_business_flows_active_version_fk;

alter table public.wa_business_flows
  add constraint wa_business_flows_active_version_fk
  foreign key (active_version_id)
  references public.wa_business_flow_versions(id);

alter table public.wa_conversation_sessions
  add column if not exists business_flow_id text,
  add column if not exists flow_version_id text,
  add column if not exists current_node_id text,
  add column if not exists flow_variables jsonb not null default '{}'::jsonb;

create index if not exists wa_flow_template_versions_template_idx
  on public.wa_flow_template_versions (template_id, status, version_number desc);

create index if not exists wa_business_flows_business_idx
  on public.wa_business_flows (business_id, status);

create index if not exists wa_business_flow_versions_flow_idx
  on public.wa_business_flow_versions (business_flow_id, status, version_number desc);

alter table public.wa_flow_templates enable row level security;
alter table public.wa_flow_template_versions enable row level security;
alter table public.wa_business_flows enable row level security;
alter table public.wa_business_flow_versions enable row level security;

grant select, insert, update, delete on public.wa_flow_templates to service_role;
grant select, insert, update, delete on public.wa_flow_template_versions to service_role;
grant select, insert, update, delete on public.wa_business_flows to service_role;
grant select, insert, update, delete on public.wa_business_flow_versions to service_role;

-- No anon/auth policies are created on purpose.
-- Internal admin and webhook runtime access these tables only through service-role server code.
