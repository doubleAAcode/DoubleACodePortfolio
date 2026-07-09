create table if not exists public.wa_catalog_groups (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  name_english text not null,
  name_arabic text not null default '',
  slug text not null,
  source text not null default 'custom',
  is_active boolean not null default true,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug),
  check (source in ('category', 'custom'))
);

create index if not exists wa_catalog_groups_business_sort_idx
  on public.wa_catalog_groups (business_id, sort_order);

create table if not exists public.wa_catalog_group_values (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  group_id text not null references public.wa_catalog_groups(id) on delete cascade,
  name_english text not null,
  name_arabic text not null default '',
  slug text not null,
  source text not null default 'custom',
  is_active boolean not null default true,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, group_id, slug),
  check (source in ('category', 'custom'))
);

create index if not exists wa_catalog_group_values_group_sort_idx
  on public.wa_catalog_group_values (business_id, group_id, sort_order);

create table if not exists public.wa_product_group_values (
  business_id text not null references public.wa_businesses(id) on delete cascade,
  product_id text not null references public.wa_products(id) on delete cascade,
  group_value_id text not null references public.wa_catalog_group_values(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, product_id, group_value_id)
);

create index if not exists wa_product_group_values_value_idx
  on public.wa_product_group_values (business_id, group_value_id);

alter table public.wa_catalog_groups enable row level security;
alter table public.wa_catalog_group_values enable row level security;
alter table public.wa_product_group_values enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.wa_catalog_groups to service_role;
grant select, insert, update, delete on public.wa_catalog_group_values to service_role;
grant select, insert, update, delete on public.wa_product_group_values to service_role;

-- Optional starter routes for the existing test business.
insert into public.wa_catalog_groups (
  id,
  business_id,
  name_english,
  name_arabic,
  slug,
  source,
  is_active,
  sort_order
)
values
  ('double-a-test-business-group-brands', 'double-a-test-business', 'Brands', 'Brands', 'brands', 'custom', true, 20),
  ('double-a-test-business-group-offers', 'double-a-test-business', 'Offers', 'Offers', 'offers', 'custom', true, 30)
on conflict (id) do update set
  name_english = excluded.name_english,
  name_arabic = excluded.name_arabic,
  slug = excluded.slug,
  source = excluded.source,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.wa_catalog_group_values (
  id,
  business_id,
  group_id,
  name_english,
  name_arabic,
  slug,
  source,
  is_active,
  sort_order
)
values
  (
    'double-a-test-business-brand-double-a',
    'double-a-test-business',
    'double-a-test-business-group-brands',
    'Double A',
    'Double A',
    'double-a',
    'custom',
    true,
    10
  ),
  (
    'double-a-test-business-offer-new-arrivals',
    'double-a-test-business',
    'double-a-test-business-group-offers',
    'New arrivals',
    'New arrivals',
    'new-arrivals',
    'custom',
    true,
    10
  )
on conflict (id) do update set
  group_id = excluded.group_id,
  name_english = excluded.name_english,
  name_arabic = excluded.name_arabic,
  slug = excluded.slug,
  source = excluded.source,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
