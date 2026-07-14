-- WhatsApp chatbot full Supabase setup
-- Generated for a new Supabase project. Run once in SQL Editor.
-- Contains only the base chatbot/admin schema and seed data.
-- Review environment variables and Meta webhook settings after running this script.


-- ============================================================
-- Source: supabase\wa_catalog_settings_schema.sql
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.wa_businesses (
  id text primary key,
  name text not null,
  default_language text not null default 'en',
  currency text not null default 'USD',
  allow_delivery boolean not null default true,
  allow_pickup boolean not null default true,
  minimum_order_amount numeric(12, 2) not null default 0,
  order_confirmation_message_english text not null,
  order_confirmation_message_arabic text not null,
  require_owner_approval boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wa_categories (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  name_english text not null,
  name_arabic text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wa_categories_business_sort_idx
  on public.wa_categories (business_id, sort_order);

create table if not exists public.wa_products (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  category_id text references public.wa_categories(id) on delete set null,
  code text not null,
  name_english text not null,
  name_arabic text not null,
  description_english text not null default '',
  description_arabic text not null default '',
  price numeric(12, 2) not null,
  image_url text,
  is_active boolean not null default true,
  is_available boolean not null default true,
  stock_quantity integer not null default 0,
  variant_selection_mode text not null default 'step_by_step',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code)
);

create index if not exists wa_products_category_sort_idx
  on public.wa_products (business_id, category_id, sort_order);

create table if not exists public.wa_product_options (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  product_id text not null references public.wa_products(id) on delete cascade,
  name_english text not null,
  name_arabic text not null,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wa_product_options_product_sort_idx
  on public.wa_product_options (business_id, product_id, sort_order);

create table if not exists public.wa_product_option_values (
  id text primary key,
  option_id text not null references public.wa_product_options(id) on delete cascade,
  value_english text not null,
  value_arabic text not null,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wa_product_option_values
  add column if not exists image_url text;

alter table public.wa_products
  add column if not exists variant_selection_mode text not null default 'step_by_step';

create index if not exists wa_product_option_values_option_sort_idx
  on public.wa_product_option_values (option_id, sort_order);

create table if not exists public.wa_product_variants (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  product_id text not null references public.wa_products(id) on delete cascade,
  sku text not null,
  selected_option_value_ids text[] not null default '{}'::text[],
  price numeric(12, 2) not null,
  stock_quantity integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sku)
);

create index if not exists wa_product_variants_product_idx
  on public.wa_product_variants (business_id, product_id);

create table if not exists public.wa_product_custom_fields (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  product_id text not null references public.wa_products(id) on delete cascade,
  type text not null,
  label_english text not null,
  label_arabic text not null,
  placeholder_english text,
  placeholder_arabic text,
  is_required boolean not null default false,
  minimum_length integer,
  maximum_length integer,
  minimum_value numeric,
  maximum_value numeric,
  choices jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wa_product_custom_fields_product_sort_idx
  on public.wa_product_custom_fields (business_id, product_id, sort_order);

create table if not exists public.wa_delivery_areas (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  name_english text not null,
  name_arabic text not null,
  delivery_fee numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wa_delivery_areas_business_sort_idx
  on public.wa_delivery_areas (business_id, sort_order);

create table if not exists public.wa_pickup_locations (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  name_english text not null,
  name_arabic text not null,
  address_english text not null,
  address_arabic text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wa_pickup_locations_business_sort_idx
  on public.wa_pickup_locations (business_id, sort_order);

create table if not exists public.wa_payment_methods (
  id text primary key,
  business_id text not null references public.wa_businesses(id) on delete cascade,
  label_english text not null,
  label_arabic text not null,
  fulfillment_methods text[] not null default '{}'::text[],
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wa_payment_methods_business_sort_idx
  on public.wa_payment_methods (business_id, sort_order);

do $$
begin
  alter table public.wa_products
    add constraint wa_products_variant_selection_mode_check
    check (variant_selection_mode in ('step_by_step', 'variant_list'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_products
    add constraint wa_products_stock_non_negative_check check (stock_quantity >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_products
    add constraint wa_products_price_non_negative_check check (price >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_product_variants
    add constraint wa_product_variants_stock_non_negative_check check (stock_quantity >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_product_variants
    add constraint wa_product_variants_price_non_negative_check check (price >= 0);
exception
  when duplicate_object then null;
end $$;

insert into public.wa_businesses (
  id,
  name,
  default_language,
  currency,
  allow_delivery,
  allow_pickup,
  minimum_order_amount,
  order_confirmation_message_english,
  order_confirmation_message_arabic,
  require_owner_approval,
  is_active
)
values (
  'double-a-test-business',
  'Double A Test Business',
  'en',
  'USD',
  true,
  true,
  0,
  'The store will review and confirm your order shortly.',
  'سيراجع المتجر طلبك ويؤكده قريبا.',
  true,
  true
)
on conflict (id) do update set
  name = excluded.name,
  default_language = excluded.default_language,
  currency = excluded.currency,
  allow_delivery = excluded.allow_delivery,
  allow_pickup = excluded.allow_pickup,
  minimum_order_amount = excluded.minimum_order_amount,
  order_confirmation_message_english = excluded.order_confirmation_message_english,
  order_confirmation_message_arabic = excluded.order_confirmation_message_arabic,
  require_owner_approval = excluded.require_owner_approval,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.wa_categories (id, business_id, name_english, name_arabic, is_active, sort_order)
values
  ('cat-accessories', 'double-a-test-business', 'Accessories', 'إكسسوارات', true, 1),
  ('cat-clothing', 'double-a-test-business', 'Clothing', 'ملابس', true, 2),
  ('cat-gifts', 'double-a-test-business', 'Gifts', 'هدايا', true, 3)
on conflict (id) do update set
  business_id = excluded.business_id,
  name_english = excluded.name_english,
  name_arabic = excluded.name_arabic,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.wa_products (
  id,
  business_id,
  category_id,
  code,
  name_english,
  name_arabic,
  description_english,
  description_arabic,
  price,
  is_active,
  is_available,
  stock_quantity,
  sort_order
)
values
  ('prod-gold-necklace', 'double-a-test-business', 'cat-accessories', 'NCK-001', 'Gold Necklace', 'قلادة ذهبية', 'A simple gold-plated necklace for everyday styling.', 'قلادة مطلية بالذهب بتصميم بسيط للاستخدام اليومي.', 25, true, true, 6, 1),
  ('prod-silk-scarf', 'double-a-test-business', 'cat-accessories', 'SCF-014', 'Silk Scarf', 'وشاح حرير', 'Soft printed scarf with a light finish.', 'وشاح ناعم بطبعة أنيقة وخامة خفيفة.', 18, true, false, 0, 2),
  ('prod-cotton-shirt', 'double-a-test-business', 'cat-clothing', 'SHT-101', 'Cotton Shirt', 'قميص قطني', 'Breathable cotton shirt with a clean tailored cut.', 'قميص قطني مريح بقصة مرتبة وعملية.', 32, true, true, 8, 1),
  ('prod-linen-dress', 'double-a-test-business', 'cat-clothing', 'DRS-220', 'Linen Dress', 'فستان كتان', 'Relaxed linen dress made for warm days.', 'فستان كتان مريح مناسب للأيام الدافئة.', 48, true, true, 3, 2),
  ('prod-hidden-jacket', 'double-a-test-business', 'cat-clothing', 'JKT-404', 'Archived Jacket', 'جاكيت مؤرشف', 'Inactive product kept out of customer selection.', 'منتج غير نشط لا يظهر للعملاء.', 65, false, true, 2, 3),
  ('prod-candle-set', 'double-a-test-business', 'cat-gifts', 'GFT-330', 'Candle Set', 'مجموعة شموع', 'Three scented candles packed as a ready gift.', 'ثلاث شموع معطرة مغلفة كهدية جاهزة.', 22, true, true, 10, 1),
  ('prod-gift-box', 'double-a-test-business', 'cat-gifts', 'GFT-500', 'Premium Gift Box', 'علبة هدايا فاخرة', 'Curated gift box with accessories and a handwritten card.', 'علبة هدايا مختارة مع إكسسوارات وبطاقة مكتوبة بخط اليد.', 55, true, true, 4, 2)
on conflict (id) do update set
  business_id = excluded.business_id,
  category_id = excluded.category_id,
  code = excluded.code,
  name_english = excluded.name_english,
  name_arabic = excluded.name_arabic,
  description_english = excluded.description_english,
  description_arabic = excluded.description_arabic,
  price = excluded.price,
  is_active = excluded.is_active,
  is_available = excluded.is_available,
  stock_quantity = excluded.stock_quantity,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.wa_product_options (
  id,
  business_id,
  product_id,
  name_english,
  name_arabic,
  sort_order,
  is_required
)
values
  ('opt-necklace-material', 'double-a-test-business', 'prod-gold-necklace', 'Material', 'الخامة', 1, true),
  ('opt-necklace-length', 'double-a-test-business', 'prod-gold-necklace', 'Length', 'الطول', 2, true),
  ('opt-shirt-size', 'double-a-test-business', 'prod-cotton-shirt', 'Size', 'المقاس', 1, true),
  ('opt-shirt-color', 'double-a-test-business', 'prod-cotton-shirt', 'Color', 'اللون', 2, true)
on conflict (id) do update set
  business_id = excluded.business_id,
  product_id = excluded.product_id,
  name_english = excluded.name_english,
  name_arabic = excluded.name_arabic,
  sort_order = excluded.sort_order,
  is_required = excluded.is_required,
  updated_at = now();

insert into public.wa_product_option_values (
  id,
  option_id,
  value_english,
  value_arabic,
  sort_order
)
values
  ('val-necklace-gold', 'opt-necklace-material', 'Gold', 'ذهبي', 1),
  ('val-necklace-silver', 'opt-necklace-material', 'Silver', 'فضي', 2),
  ('val-necklace-45', 'opt-necklace-length', '45 cm', '٤٥ سم', 1),
  ('val-necklace-50', 'opt-necklace-length', '50 cm', '٥٠ سم', 2),
  ('val-shirt-small', 'opt-shirt-size', 'Small', 'صغير', 1),
  ('val-shirt-medium', 'opt-shirt-size', 'Medium', 'وسط', 2),
  ('val-shirt-large', 'opt-shirt-size', 'Large', 'كبير', 3),
  ('val-shirt-black', 'opt-shirt-color', 'Black', 'أسود', 1),
  ('val-shirt-white', 'opt-shirt-color', 'White', 'أبيض', 2)
on conflict (id) do update set
  option_id = excluded.option_id,
  value_english = excluded.value_english,
  value_arabic = excluded.value_arabic,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.wa_product_variants (
  id,
  business_id,
  product_id,
  sku,
  selected_option_value_ids,
  price,
  stock_quantity,
  is_available
)
values
  ('var-necklace-gold-45', 'double-a-test-business', 'prod-gold-necklace', 'NCK-001-G45', array['val-necklace-gold', 'val-necklace-45'], 25, 4, true),
  ('var-necklace-gold-50', 'double-a-test-business', 'prod-gold-necklace', 'NCK-001-G50', array['val-necklace-gold', 'val-necklace-50'], 28, 2, true),
  ('var-necklace-silver-45', 'double-a-test-business', 'prod-gold-necklace', 'NCK-001-S45', array['val-necklace-silver', 'val-necklace-45'], 23, 0, false),
  ('var-necklace-silver-50', 'double-a-test-business', 'prod-gold-necklace', 'NCK-001-S50', array['val-necklace-silver', 'val-necklace-50'], 26, 3, true),
  ('var-shirt-medium-black', 'double-a-test-business', 'prod-cotton-shirt', 'SHT-101-M-BLK', array['val-shirt-medium', 'val-shirt-black'], 32, 3, true),
  ('var-shirt-large-white', 'double-a-test-business', 'prod-cotton-shirt', 'SHT-101-L-WHT', array['val-shirt-large', 'val-shirt-white'], 34, 1, true)
on conflict (id) do update set
  business_id = excluded.business_id,
  product_id = excluded.product_id,
  sku = excluded.sku,
  selected_option_value_ids = excluded.selected_option_value_ids,
  price = excluded.price,
  stock_quantity = excluded.stock_quantity,
  is_available = excluded.is_available,
  updated_at = now();

insert into public.wa_product_custom_fields (
  id,
  business_id,
  product_id,
  type,
  label_english,
  label_arabic,
  placeholder_english,
  placeholder_arabic,
  is_required,
  minimum_length,
  maximum_length,
  choices,
  sort_order
)
values
  ('field-necklace-engraving', 'double-a-test-business', 'prod-gold-necklace', 'short_text', 'Engraving text', 'نص الحفر', 'Example: Sarah', 'مثال: سارة', true, 2, 20, null, 1),
  ('field-gift-message', 'double-a-test-business', 'prod-gift-box', 'long_text', 'Gift message', 'رسالة الهدية', 'Write a short message or type skip.', 'اكتب رسالة قصيرة أو اكتب تخطي.', false, null, 120, null, 1),
  ('field-candle-wrap', 'double-a-test-business', 'prod-candle-set', 'yes_no', 'Gift wrapping', 'تغليف هدية', null, null, true, null, null, null, 1)
on conflict (id) do update set
  business_id = excluded.business_id,
  product_id = excluded.product_id,
  type = excluded.type,
  label_english = excluded.label_english,
  label_arabic = excluded.label_arabic,
  placeholder_english = excluded.placeholder_english,
  placeholder_arabic = excluded.placeholder_arabic,
  is_required = excluded.is_required,
  minimum_length = excluded.minimum_length,
  maximum_length = excluded.maximum_length,
  choices = excluded.choices,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.wa_delivery_areas (
  id,
  business_id,
  name_english,
  name_arabic,
  delivery_fee,
  is_active,
  sort_order
)
values
  ('area-beirut', 'double-a-test-business', 'Beirut', 'بيروت', 3, true, 1),
  ('area-metn', 'double-a-test-business', 'Metn', 'المتن', 4, true, 2),
  ('area-other', 'double-a-test-business', 'Other Lebanon areas', 'مناطق لبنان الأخرى', 5, true, 3)
on conflict (id) do update set
  business_id = excluded.business_id,
  name_english = excluded.name_english,
  name_arabic = excluded.name_arabic,
  delivery_fee = excluded.delivery_fee,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.wa_pickup_locations (
  id,
  business_id,
  name_english,
  name_arabic,
  address_english,
  address_arabic,
  is_active,
  sort_order
)
values
  ('pickup-main', 'double-a-test-business', 'Main store', 'المتجر الرئيسي', 'Double A main pickup desk', 'مكتب الاستلام الرئيسي', true, 1)
on conflict (id) do update set
  business_id = excluded.business_id,
  name_english = excluded.name_english,
  name_arabic = excluded.name_arabic,
  address_english = excluded.address_english,
  address_arabic = excluded.address_arabic,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.wa_payment_methods (
  id,
  business_id,
  label_english,
  label_arabic,
  fulfillment_methods,
  is_active,
  sort_order
)
values
  ('cash_on_delivery', 'double-a-test-business', 'Cash on delivery', 'الدفع عند التوصيل', array['delivery'], true, 1),
  ('cash_on_pickup', 'double-a-test-business', 'Cash on pickup', 'الدفع عند الاستلام', array['pickup'], true, 2)
on conflict (id) do update set
  business_id = excluded.business_id,
  label_english = excluded.label_english,
  label_arabic = excluded.label_arabic,
  fulfillment_methods = excluded.fulfillment_methods,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

alter table public.wa_businesses enable row level security;
alter table public.wa_categories enable row level security;
alter table public.wa_products enable row level security;
alter table public.wa_product_options enable row level security;
alter table public.wa_product_option_values enable row level security;
alter table public.wa_product_variants enable row level security;
alter table public.wa_product_custom_fields enable row level security;
alter table public.wa_delivery_areas enable row level security;
alter table public.wa_pickup_locations enable row level security;
alter table public.wa_payment_methods enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.wa_businesses to service_role;
grant select, insert, update, delete on public.wa_categories to service_role;
grant select, insert, update, delete on public.wa_products to service_role;
grant select, insert, update, delete on public.wa_product_options to service_role;
grant select, insert, update, delete on public.wa_product_option_values to service_role;
grant select, insert, update, delete on public.wa_product_variants to service_role;
grant select, insert, update, delete on public.wa_product_custom_fields to service_role;
grant select, insert, update, delete on public.wa_delivery_areas to service_role;
grant select, insert, update, delete on public.wa_pickup_locations to service_role;
grant select, insert, update, delete on public.wa_payment_methods to service_role;

insert into storage.buckets (id, name, public)
values ('wa-product-images', 'wa-product-images', true)
on conflict (id) do update set public = true;

-- No anon/auth policies are created on purpose.
-- The bot and owner dashboard read/write these tables only from server code using SUPABASE_SERVICE_ROLE_KEY.
-- Product images are uploaded by the server to the public wa-product-images bucket, then only the URL is stored.


-- ============================================================
-- Source: supabase\wa_bot_core_schema.sql
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.wa_conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  customer_phone text not null,
  current_step text not null,
  language text,
  context jsonb not null default '{}'::jsonb,
  last_customer_message_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, customer_phone)
);

create index if not exists wa_conversation_sessions_lookup_idx
  on public.wa_conversation_sessions (business_id, customer_phone);

create index if not exists wa_conversation_sessions_expires_at_idx
  on public.wa_conversation_sessions (expires_at);

create table if not exists public.wa_processed_messages (
  message_id text primary key,
  business_id text not null,
  customer_phone text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists wa_processed_messages_expires_at_idx
  on public.wa_processed_messages (expires_at);

create table if not exists public.wa_customer_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  customer_phone text not null,
  customer_name text not null,
  language text not null default 'en',
  fulfillment_method text not null,
  delivery_area_id text,
  delivery_address text,
  delivery_latitude numeric,
  delivery_longitude numeric,
  pickup_location_id text,
  payment_method text not null,
  notes text,
  last_order_id uuid,
  last_order_number text,
  last_ordered_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, customer_phone)
);

create index if not exists wa_customer_profiles_lookup_idx
  on public.wa_customer_profiles (business_id, customer_phone);

create table if not exists public.wa_orders (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  order_number text not null unique,
  idempotency_key text not null unique,
  customer_name text not null,
  customer_phone text not null,
  alternate_phone text,
  language text not null,
  status text not null default 'PENDING_OWNER_CONFIRMATION',
  fulfillment_method text not null,
  delivery_area_id text,
  delivery_address text,
  delivery_latitude numeric,
  delivery_longitude numeric,
  pickup_location_id text,
  payment_method text not null,
  notes text,
  subtotal numeric(12, 2) not null,
  delivery_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  out_for_delivery_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  rejection_reason text,
  cancellation_reason text,
  restock_required boolean not null default false,
  decided_by text,
  customer_notification_status text not null default 'NOT_SENT',
  customer_notification_error text,
  customer_notified_at timestamptz,
  template_notification_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wa_orders
  add column if not exists accepted_at timestamptz,
  add column if not exists preparing_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists out_for_delivery_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists cancellation_reason text,
  add column if not exists restock_required boolean not null default false,
  add column if not exists decided_by text,
  add column if not exists customer_notification_status text not null default 'NOT_SENT',
  add column if not exists customer_notification_error text,
  add column if not exists customer_notified_at timestamptz,
  add column if not exists template_notification_required boolean not null default false;

create index if not exists wa_orders_created_at_idx
  on public.wa_orders (created_at desc);

create index if not exists wa_orders_customer_phone_idx
  on public.wa_orders (customer_phone);

create index if not exists wa_orders_business_status_created_idx
  on public.wa_orders (business_id, status, created_at desc);

create table if not exists public.wa_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  product_id text not null,
  variant_id text,
  product_code text not null,
  product_name text not null,
  selected_options jsonb not null default '[]'::jsonb,
  custom_field_answers jsonb not null default '[]'::jsonb,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  line_total numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists wa_order_items_order_id_idx
  on public.wa_order_items (order_id);

create table if not exists public.wa_stock_reservations (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  product_variant_id text not null,
  quantity integer not null check (quantity > 0),
  status text not null default 'ACTIVE',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists wa_stock_reservations_active_idx
  on public.wa_stock_reservations (product_variant_id, status, expires_at);

create index if not exists wa_stock_reservations_business_stock_active_idx
  on public.wa_stock_reservations (business_id, product_variant_id, status, expires_at);

create table if not exists public.wa_order_status_history (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  previous_status text,
  new_status text not null,
  reason text,
  changed_by_user_id text,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists wa_order_status_history_order_idx
  on public.wa_order_status_history (business_id, order_id, created_at asc);

create table if not exists public.wa_order_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  customer_phone text not null,
  order_status text not null,
  message_type text not null,
  language text not null,
  status text not null default 'PENDING',
  meta_message_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create unique index if not exists wa_order_notifications_unique_idx
  on public.wa_order_notifications (business_id, order_id, order_status, message_type);

create index if not exists wa_order_notifications_order_idx
  on public.wa_order_notifications (business_id, order_id, created_at desc);

do $$
begin
  alter table public.wa_orders
    add constraint wa_orders_status_check
    check (status in (
      'PENDING_OWNER_CONFIRMATION',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'COMPLETED',
      'REJECTED',
      'CANCELLED'
    ));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_orders
    add constraint wa_orders_totals_non_negative_check
    check (subtotal >= 0 and delivery_fee >= 0 and total >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_stock_reservations
    add constraint wa_stock_reservations_status_check
    check (status in ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_order_notifications
    add constraint wa_order_notifications_status_check
    check (status in ('PENDING', 'SENT', 'FAILED', 'RETRYABLE', 'TEMPLATE_REQUIRED', 'SKIPPED'));
exception
  when duplicate_object then null;
end $$;

create sequence if not exists public.wa_order_number_seq start with 1 increment by 1;

create or replace function public.wa_create_pending_order(
  p_business_id text,
  p_idempotency_key text,
  p_order jsonb,
  p_items jsonb,
  p_reservations jsonb
)
returns table (
  id uuid,
  order_number text,
  duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.wa_orders%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_reservation jsonb;
  v_stock_id text;
  v_requested_quantity integer;
  v_stock_quantity integer;
  v_active_reserved integer;
begin
  select *
    into v_existing
    from public.wa_orders
   where idempotency_key = p_idempotency_key
   limit 1;

  if found then
    id := v_existing.id;
    order_number := v_existing.order_number;
    duplicate := true;
    return next;
    return;
  end if;

  update public.wa_stock_reservations as sr
     set status = 'EXPIRED'
   where sr.business_id = p_business_id
     and sr.status = 'ACTIVE'
     and sr.expires_at <= now();

  for v_reservation in select * from jsonb_array_elements(p_reservations)
  loop
    v_stock_id := v_reservation->>'productVariantId';
    v_requested_quantity := (v_reservation->>'quantity')::integer;

    if v_stock_id is null or v_stock_id = '' or v_requested_quantity is null or v_requested_quantity <= 0 then
      raise exception 'Invalid stock reservation request.';
    end if;

    select pv.stock_quantity
      into v_stock_quantity
      from public.wa_product_variants as pv
     where pv.id = v_stock_id
       and pv.business_id = p_business_id
       and pv.is_available = true
     for update;

    if not found then
      select p.stock_quantity
        into v_stock_quantity
        from public.wa_products as p
       where p.id = v_stock_id
         and p.business_id = p_business_id
         and p.is_active = true
         and p.is_available = true
       for update;
    end if;

    if not found then
      raise exception 'Requested item is not available.';
    end if;

    select coalesce(sum(sr.quantity), 0)::integer
      into v_active_reserved
      from public.wa_stock_reservations as sr
     where sr.business_id = p_business_id
       and sr.product_variant_id = v_stock_id
       and sr.status = 'ACTIVE'
       and sr.expires_at > now();

    if v_requested_quantity > greatest(0, v_stock_quantity - v_active_reserved) then
      raise exception 'Insufficient stock for reservation %.%', v_stock_id, v_requested_quantity;
    end if;
  end loop;

  v_order_id := gen_random_uuid();
  v_order_number := 'DA-' || lpad(nextval('public.wa_order_number_seq')::text, 6, '0');

  insert into public.wa_orders (
    id,
    business_id,
    order_number,
    idempotency_key,
    customer_name,
    customer_phone,
    alternate_phone,
    language,
    status,
    fulfillment_method,
    delivery_area_id,
    delivery_address,
    delivery_latitude,
    delivery_longitude,
    pickup_location_id,
    payment_method,
    notes,
    subtotal,
    delivery_fee,
    total
  )
  values (
    v_order_id,
    p_business_id,
    v_order_number,
    p_idempotency_key,
    p_order->>'customerName',
    p_order->>'customerPhone',
    nullif(p_order->>'alternatePhone', ''),
    p_order->>'language',
    'PENDING_OWNER_CONFIRMATION',
    p_order->>'fulfillmentMethod',
    nullif(p_order->>'deliveryAreaId', ''),
    nullif(p_order->>'deliveryAddress', ''),
    nullif(p_order->>'deliveryLatitude', '')::numeric,
    nullif(p_order->>'deliveryLongitude', '')::numeric,
    nullif(p_order->>'pickupLocationId', ''),
    p_order->>'paymentMethod',
    nullif(p_order->>'notes', ''),
    (p_order->>'subtotal')::numeric,
    (p_order->>'deliveryFee')::numeric,
    (p_order->>'total')::numeric
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.wa_order_items (
      order_id,
      product_id,
      variant_id,
      product_code,
      product_name,
      selected_options,
      custom_field_answers,
      quantity,
      unit_price,
      line_total
    )
    values (
      v_order_id,
      v_item->>'productId',
      nullif(v_item->>'variantId', ''),
      v_item->>'productCode',
      v_item->>'productName',
      coalesce(v_item->'selectedOptions', '[]'::jsonb),
      coalesce(v_item->'customFieldAnswers', '[]'::jsonb),
      (v_item->>'quantity')::integer,
      (v_item->>'unitPrice')::numeric,
      (v_item->>'lineTotal')::numeric
    );
  end loop;

  for v_reservation in select * from jsonb_array_elements(p_reservations)
  loop
    insert into public.wa_stock_reservations (
      business_id,
      order_id,
      product_variant_id,
      quantity,
      status,
      expires_at
    )
    values (
      p_business_id,
      v_order_id,
      v_reservation->>'productVariantId',
      (v_reservation->>'quantity')::integer,
      'ACTIVE',
      (v_reservation->>'expiresAt')::timestamptz
    );
  end loop;

  id := v_order_id;
  order_number := v_order_number;
  duplicate := false;
  return next;
end;
$$;

create or replace function public.wa_accept_order(
  p_business_id text,
  p_order_id uuid,
  p_decided_by text
)
returns table (
  id uuid,
  order_number text,
  customer_phone text,
  language text,
  status text,
  customer_notification_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.wa_orders%rowtype;
  v_reservation public.wa_stock_reservations%rowtype;
  v_updated_count integer;
begin
  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id
   for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if v_order.status <> 'PENDING_OWNER_CONFIRMATION' then
    raise exception 'Only pending orders can be accepted.';
  end if;

  update public.wa_stock_reservations as sr
     set status = 'EXPIRED'
   where sr.order_id = p_order_id
     and sr.business_id = p_business_id
     and sr.status = 'ACTIVE'
     and sr.expires_at <= now();

  if exists (
    select 1
      from public.wa_stock_reservations as sr
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'EXPIRED'
  ) then
    raise exception 'Stock reservation expired.';
  end if;

  if not exists (
    select 1
      from public.wa_stock_reservations as sr
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'ACTIVE'
  ) then
    raise exception 'No active stock reservations were found.';
  end if;

  for v_reservation in
    select *
      from public.wa_stock_reservations as sr
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'ACTIVE'
     for update
  loop
    update public.wa_product_variants as pv
       set stock_quantity = pv.stock_quantity - v_reservation.quantity,
           updated_at = now()
     where pv.id = v_reservation.product_variant_id
       and pv.business_id = p_business_id
       and pv.stock_quantity >= v_reservation.quantity;

    get diagnostics v_updated_count = row_count;

    if v_updated_count = 0 then
      update public.wa_products as p
         set stock_quantity = p.stock_quantity - v_reservation.quantity,
             updated_at = now()
       where p.id = v_reservation.product_variant_id
         and p.business_id = p_business_id
         and p.stock_quantity >= v_reservation.quantity;

      get diagnostics v_updated_count = row_count;
    end if;

    if v_updated_count = 0 then
      raise exception 'Insufficient stock for reservation %.%', v_reservation.product_variant_id, v_reservation.quantity;
    end if;
  end loop;

  update public.wa_stock_reservations as sr
     set status = 'COMMITTED'
   where sr.order_id = p_order_id
     and sr.business_id = p_business_id
     and sr.status = 'ACTIVE';

  update public.wa_orders as o
     set status = 'ACCEPTED',
         accepted_at = coalesce(o.accepted_at, now()),
         decided_by = nullif(p_decided_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

  insert into public.wa_order_status_history (
    business_id,
    order_id,
    previous_status,
    new_status,
    reason,
    changed_by_user_id,
    source
  )
  values (
    p_business_id,
    p_order_id,
    v_order.status,
    'ACCEPTED',
    null,
    nullif(p_decided_by, ''),
    'OWNER_DASHBOARD'
  );

  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id;

  id := v_order.id;
  order_number := v_order.order_number;
  customer_phone := v_order.customer_phone;
  language := v_order.language;
  status := v_order.status;
  customer_notification_status := v_order.customer_notification_status;
  return next;
end;
$$;

create or replace function public.wa_reject_order(
  p_business_id text,
  p_order_id uuid,
  p_reason text,
  p_decided_by text
)
returns table (
  id uuid,
  order_number text,
  customer_phone text,
  language text,
  status text,
  customer_notification_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.wa_orders%rowtype;
begin
  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id
   for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if v_order.status <> 'PENDING_OWNER_CONFIRMATION' then
    raise exception 'Only pending orders can be rejected.';
  end if;

  update public.wa_stock_reservations as sr
     set status = 'RELEASED'
   where sr.order_id = p_order_id
     and sr.business_id = p_business_id
     and sr.status = 'ACTIVE';

  update public.wa_orders as o
     set status = 'REJECTED',
         rejected_at = coalesce(o.rejected_at, now()),
         rejection_reason = nullif(p_reason, ''),
         decided_by = nullif(p_decided_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

  insert into public.wa_order_status_history (
    business_id,
    order_id,
    previous_status,
    new_status,
    reason,
    changed_by_user_id,
    source
  )
  values (
    p_business_id,
    p_order_id,
    v_order.status,
    'REJECTED',
    nullif(p_reason, ''),
    nullif(p_decided_by, ''),
    'OWNER_DASHBOARD'
  );

  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id;

  id := v_order.id;
  order_number := v_order.order_number;
  customer_phone := v_order.customer_phone;
  language := v_order.language;
  status := v_order.status;
  customer_notification_status := v_order.customer_notification_status;
  return next;
end;
$$;

create or replace function public.wa_transition_order_status(
  p_business_id text,
  p_order_id uuid,
  p_target_status text,
  p_reason text,
  p_changed_by text,
  p_source text default 'OWNER_DASHBOARD'
)
returns table (
  id uuid,
  order_number text,
  customer_phone text,
  language text,
  status text,
  previous_status text,
  fulfillment_method text,
  customer_notification_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.wa_orders%rowtype;
  v_previous_status text;
  v_reason text;
  v_source text;
begin
  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id
   for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  v_previous_status := v_order.status;

  v_reason := nullif(left(trim(coalesce(p_reason, '')), 500), '');
  v_source := coalesce(nullif(trim(p_source), ''), 'OWNER_DASHBOARD');

  if v_order.status in ('COMPLETED', 'REJECTED', 'CANCELLED') then
    raise exception 'Terminal orders cannot be changed.';
  end if;

  if p_target_status not in ('PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED') then
    raise exception 'Unsupported order status transition.';
  end if;

  if p_target_status = 'CANCELLED' and v_reason is null then
    raise exception 'Cancellation reason is required.';
  end if;

  if not (
    (v_order.status = 'PENDING_OWNER_CONFIRMATION' and p_target_status = 'CANCELLED') or
    (v_order.status = 'ACCEPTED' and p_target_status in ('PREPARING', 'CANCELLED')) or
    (v_order.status = 'PREPARING' and p_target_status in ('READY', 'CANCELLED')) or
    (v_order.status = 'READY' and p_target_status in ('OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED')) or
    (v_order.status = 'OUT_FOR_DELIVERY' and p_target_status in ('COMPLETED', 'CANCELLED'))
  ) then
    raise exception 'Invalid order status transition from % to %.', v_order.status, p_target_status;
  end if;

  if v_order.fulfillment_method = 'pickup' and p_target_status = 'OUT_FOR_DELIVERY' then
    raise exception 'Pickup orders cannot be marked out for delivery.';
  end if;

  if v_order.fulfillment_method = 'delivery'
     and v_order.status = 'READY'
     and p_target_status = 'COMPLETED' then
    raise exception 'Delivery orders must be marked out for delivery before completion.';
  end if;

  if p_target_status = 'CANCELLED' and v_order.status = 'PENDING_OWNER_CONFIRMATION' then
    update public.wa_stock_reservations as sr
       set status = 'RELEASED'
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'ACTIVE';
  end if;

  update public.wa_orders as o
     set status = p_target_status,
         preparing_at = case
           when p_target_status = 'PREPARING' then coalesce(o.preparing_at, now())
           else o.preparing_at
         end,
         ready_at = case
           when p_target_status = 'READY' then coalesce(o.ready_at, now())
           else o.ready_at
         end,
         out_for_delivery_at = case
           when p_target_status = 'OUT_FOR_DELIVERY' then coalesce(o.out_for_delivery_at, now())
           else o.out_for_delivery_at
         end,
         completed_at = case
           when p_target_status = 'COMPLETED' then coalesce(o.completed_at, now())
           else o.completed_at
         end,
         cancelled_at = case
           when p_target_status = 'CANCELLED' then coalesce(o.cancelled_at, now())
           else o.cancelled_at
         end,
         cancellation_reason = case
           when p_target_status = 'CANCELLED' then v_reason
           else o.cancellation_reason
         end,
         restock_required = case
           when p_target_status = 'CANCELLED' and v_order.status in ('ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY') then true
           else o.restock_required
         end,
         decided_by = nullif(p_changed_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

  insert into public.wa_order_status_history (
    business_id,
    order_id,
    previous_status,
    new_status,
    reason,
    changed_by_user_id,
    source
  )
  values (
    p_business_id,
    p_order_id,
    v_order.status,
    p_target_status,
    v_reason,
    nullif(p_changed_by, ''),
    v_source
  );

  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id;

  id := v_order.id;
  order_number := v_order.order_number;
  customer_phone := v_order.customer_phone;
  language := v_order.language;
  status := v_order.status;
  previous_status := v_previous_status;
  fulfillment_method := v_order.fulfillment_method;
  customer_notification_status := v_order.customer_notification_status;
  return next;
end;
$$;

create or replace function public.wa_expire_stock_reservations(
  p_business_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.wa_stock_reservations as sr
     set status = 'EXPIRED'
   where sr.business_id = p_business_id
     and sr.status = 'ACTIVE'
     and sr.expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

alter table public.wa_conversation_sessions enable row level security;
alter table public.wa_processed_messages enable row level security;
alter table public.wa_customer_profiles enable row level security;
alter table public.wa_orders enable row level security;
alter table public.wa_order_items enable row level security;
alter table public.wa_stock_reservations enable row level security;
alter table public.wa_order_status_history enable row level security;
alter table public.wa_order_notifications enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.wa_conversation_sessions to service_role;
grant select, insert, update, delete on public.wa_processed_messages to service_role;
grant select, insert, update, delete on public.wa_customer_profiles to service_role;
grant select, insert, update, delete on public.wa_orders to service_role;
grant select, insert, update, delete on public.wa_order_items to service_role;
grant select, insert, update, delete on public.wa_stock_reservations to service_role;
grant select, insert, update, delete on public.wa_order_status_history to service_role;
grant select, insert, update, delete on public.wa_order_notifications to service_role;
grant usage, select on sequence public.wa_order_number_seq to service_role;
grant execute on function public.wa_create_pending_order(text, text, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.wa_accept_order(text, uuid, text) to service_role;
grant execute on function public.wa_reject_order(text, uuid, text, text) to service_role;
grant execute on function public.wa_transition_order_status(text, uuid, text, text, text, text) to service_role;
grant execute on function public.wa_expire_stock_reservations(text) to service_role;

-- No anon/auth policies are created on purpose.
-- The app reads/writes these tables only from server code using SUPABASE_SERVICE_ROLE_KEY.


-- ============================================================
-- Source: supabase\wa_order_lifecycle_schema.sql
-- ============================================================

-- Milestone 10 order lifecycle upgrade.
-- Run this once in Supabase SQL editor after the core WhatsApp schema exists.

create extension if not exists pgcrypto;

alter table public.wa_orders
  add column if not exists preparing_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists out_for_delivery_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists restock_required boolean not null default false;

create table if not exists public.wa_order_status_history (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  previous_status text,
  new_status text not null,
  reason text,
  changed_by_user_id text,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists wa_order_status_history_order_idx
  on public.wa_order_status_history (business_id, order_id, created_at asc);

create table if not exists public.wa_order_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  order_id uuid not null references public.wa_orders(id) on delete cascade,
  customer_phone text not null,
  order_status text not null,
  message_type text not null,
  language text not null,
  status text not null default 'PENDING',
  meta_message_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create unique index if not exists wa_order_notifications_unique_idx
  on public.wa_order_notifications (business_id, order_id, order_status, message_type);

create index if not exists wa_order_notifications_order_idx
  on public.wa_order_notifications (business_id, order_id, created_at desc);

create or replace function public.wa_transition_order_status(
  p_business_id text,
  p_order_id uuid,
  p_target_status text,
  p_reason text,
  p_changed_by text,
  p_source text default 'OWNER_DASHBOARD'
)
returns table (
  id uuid,
  order_number text,
  customer_phone text,
  language text,
  status text,
  previous_status text,
  fulfillment_method text,
  customer_notification_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.wa_orders%rowtype;
  v_previous_status text;
  v_reason text;
  v_source text;
begin
  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id
   for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  v_previous_status := v_order.status;
  v_reason := nullif(left(trim(coalesce(p_reason, '')), 500), '');
  v_source := coalesce(nullif(trim(p_source), ''), 'OWNER_DASHBOARD');

  if v_order.status in ('COMPLETED', 'REJECTED', 'CANCELLED') then
    raise exception 'Terminal orders cannot be changed.';
  end if;

  if p_target_status not in ('PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED') then
    raise exception 'Unsupported order status transition.';
  end if;

  if p_target_status = 'CANCELLED' and v_reason is null then
    raise exception 'Cancellation reason is required.';
  end if;

  if not (
    (v_order.status = 'PENDING_OWNER_CONFIRMATION' and p_target_status = 'CANCELLED') or
    (v_order.status = 'ACCEPTED' and p_target_status in ('PREPARING', 'CANCELLED')) or
    (v_order.status = 'PREPARING' and p_target_status in ('READY', 'CANCELLED')) or
    (v_order.status = 'READY' and p_target_status in ('OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED')) or
    (v_order.status = 'OUT_FOR_DELIVERY' and p_target_status in ('COMPLETED', 'CANCELLED'))
  ) then
    raise exception 'Invalid order status transition from % to %.', v_order.status, p_target_status;
  end if;

  if v_order.fulfillment_method = 'pickup' and p_target_status = 'OUT_FOR_DELIVERY' then
    raise exception 'Pickup orders cannot be marked out for delivery.';
  end if;

  if v_order.fulfillment_method = 'delivery'
     and v_order.status = 'READY'
     and p_target_status = 'COMPLETED' then
    raise exception 'Delivery orders must be marked out for delivery before completion.';
  end if;

  if p_target_status = 'CANCELLED' and v_order.status = 'PENDING_OWNER_CONFIRMATION' then
    update public.wa_stock_reservations as sr
       set status = 'RELEASED'
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'ACTIVE';
  end if;

  update public.wa_orders as o
     set status = p_target_status,
         preparing_at = case when p_target_status = 'PREPARING' then coalesce(o.preparing_at, now()) else o.preparing_at end,
         ready_at = case when p_target_status = 'READY' then coalesce(o.ready_at, now()) else o.ready_at end,
         out_for_delivery_at = case when p_target_status = 'OUT_FOR_DELIVERY' then coalesce(o.out_for_delivery_at, now()) else o.out_for_delivery_at end,
         completed_at = case when p_target_status = 'COMPLETED' then coalesce(o.completed_at, now()) else o.completed_at end,
         cancelled_at = case when p_target_status = 'CANCELLED' then coalesce(o.cancelled_at, now()) else o.cancelled_at end,
         cancellation_reason = case when p_target_status = 'CANCELLED' then v_reason else o.cancellation_reason end,
         restock_required = case
           when p_target_status = 'CANCELLED' and v_order.status in ('ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY') then true
           else o.restock_required
         end,
         decided_by = nullif(p_changed_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

  insert into public.wa_order_status_history (
    business_id,
    order_id,
    previous_status,
    new_status,
    reason,
    changed_by_user_id,
    source
  )
  values (
    p_business_id,
    p_order_id,
    v_previous_status,
    p_target_status,
    v_reason,
    nullif(p_changed_by, ''),
    v_source
  );

  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id;

  id := v_order.id;
  order_number := v_order.order_number;
  customer_phone := v_order.customer_phone;
  language := v_order.language;
  status := v_order.status;
  previous_status := v_previous_status;
  fulfillment_method := v_order.fulfillment_method;
  customer_notification_status := v_order.customer_notification_status;
  return next;
end;
$$;

alter table public.wa_order_status_history enable row level security;
alter table public.wa_order_notifications enable row level security;

grant select, insert, update, delete on public.wa_order_status_history to service_role;
grant select, insert, update, delete on public.wa_order_notifications to service_role;
grant execute on function public.wa_transition_order_status(text, uuid, text, text, text, text) to service_role;


-- ============================================================
-- Source: supabase\wa_order_decision_rpc_fix.sql
-- ============================================================

-- Fix ambiguous return-column references in order decision RPCs.
-- Run this in Supabase SQL editor if accepting/rejecting an order shows:
--   column reference "status" is ambiguous
--   column reference "id" is ambiguous

create or replace function public.wa_accept_order(
  p_business_id text,
  p_order_id uuid,
  p_decided_by text
)
returns table (
  id uuid,
  order_number text,
  customer_phone text,
  language text,
  status text,
  customer_notification_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.wa_orders%rowtype;
  v_reservation public.wa_stock_reservations%rowtype;
  v_updated_count integer;
begin
  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id
   for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if v_order.status <> 'PENDING_OWNER_CONFIRMATION' then
    raise exception 'Only pending orders can be accepted.';
  end if;

  update public.wa_stock_reservations as sr
     set status = 'EXPIRED'
   where sr.order_id = p_order_id
     and sr.business_id = p_business_id
     and sr.status = 'ACTIVE'
     and sr.expires_at <= now();

  if exists (
    select 1
      from public.wa_stock_reservations as sr
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'EXPIRED'
  ) then
    raise exception 'Stock reservation expired.';
  end if;

  if not exists (
    select 1
      from public.wa_stock_reservations as sr
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'ACTIVE'
  ) then
    raise exception 'No active stock reservations were found.';
  end if;

  for v_reservation in
    select *
      from public.wa_stock_reservations as sr
     where sr.order_id = p_order_id
       and sr.business_id = p_business_id
       and sr.status = 'ACTIVE'
     for update
  loop
    update public.wa_product_variants as pv
       set stock_quantity = pv.stock_quantity - v_reservation.quantity,
           updated_at = now()
     where pv.id = v_reservation.product_variant_id
       and pv.business_id = p_business_id
       and pv.stock_quantity >= v_reservation.quantity;

    get diagnostics v_updated_count = row_count;

    if v_updated_count = 0 then
      update public.wa_products as p
         set stock_quantity = p.stock_quantity - v_reservation.quantity,
             updated_at = now()
       where p.id = v_reservation.product_variant_id
         and p.business_id = p_business_id
         and p.stock_quantity >= v_reservation.quantity;

      get diagnostics v_updated_count = row_count;
    end if;

    if v_updated_count = 0 then
      raise exception 'Insufficient stock for reservation %.%', v_reservation.product_variant_id, v_reservation.quantity;
    end if;
  end loop;

  update public.wa_stock_reservations as sr
     set status = 'COMMITTED'
   where sr.order_id = p_order_id
     and sr.business_id = p_business_id
     and sr.status = 'ACTIVE';

  update public.wa_orders as o
     set status = 'ACCEPTED',
         accepted_at = now(),
         decided_by = nullif(p_decided_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id;

  id := v_order.id;
  order_number := v_order.order_number;
  customer_phone := v_order.customer_phone;
  language := v_order.language;
  status := v_order.status;
  customer_notification_status := v_order.customer_notification_status;
  return next;
end;
$$;

create or replace function public.wa_reject_order(
  p_business_id text,
  p_order_id uuid,
  p_reason text,
  p_decided_by text
)
returns table (
  id uuid,
  order_number text,
  customer_phone text,
  language text,
  status text,
  customer_notification_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.wa_orders%rowtype;
begin
  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id
   for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if v_order.status <> 'PENDING_OWNER_CONFIRMATION' then
    raise exception 'Only pending orders can be rejected.';
  end if;

  update public.wa_stock_reservations as sr
     set status = 'RELEASED'
   where sr.order_id = p_order_id
     and sr.business_id = p_business_id
     and sr.status = 'ACTIVE';

  update public.wa_orders as o
     set status = 'REJECTED',
         rejected_at = now(),
         rejection_reason = nullif(p_reason, ''),
         decided_by = nullif(p_decided_by, ''),
         customer_notification_status = 'PENDING',
         customer_notification_error = null,
         template_notification_required = false,
         updated_at = now()
   where o.id = p_order_id
     and o.business_id = p_business_id;

  select *
    into v_order
    from public.wa_orders as o
   where o.id = p_order_id
     and o.business_id = p_business_id;

  id := v_order.id;
  order_number := v_order.order_number;
  customer_phone := v_order.customer_phone;
  language := v_order.language;
  status := v_order.status;
  customer_notification_status := v_order.customer_notification_status;
  return next;
end;
$$;

create or replace function public.wa_expire_stock_reservations(
  p_business_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.wa_stock_reservations as sr
     set status = 'EXPIRED'
   where sr.business_id = p_business_id
     and sr.status = 'ACTIVE'
     and sr.expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.wa_accept_order(text, uuid, text) to service_role;
grant execute on function public.wa_reject_order(text, uuid, text, text) to service_role;
grant execute on function public.wa_expire_stock_reservations(text) to service_role;


-- ============================================================
-- Source: supabase\wa_webhook_logs_schema.sql
-- ============================================================

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

grant usage on schema public to service_role;
grant select, insert, update, delete on public.wa_webhook_logs to service_role;

-- No anon/auth policies are created on purpose.
-- The app reads/writes this table only from server code using SUPABASE_SERVICE_ROLE_KEY.


-- ============================================================
-- Source: supabase\wa_whatsapp_connections_schema.sql
-- ============================================================

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


-- ============================================================
-- Source: supabase\wa_reliability_hardening.sql
-- ============================================================

-- Milestone 11 reliability, concurrency and data-integrity hardening.
-- Run after the catalog, core bot, and order lifecycle SQL files.

create extension if not exists pgcrypto;

do $$
begin
  alter table public.wa_products
    add constraint wa_products_stock_non_negative_check check (stock_quantity >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_products
    add constraint wa_products_price_non_negative_check check (price >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_products
    add constraint wa_products_code_not_blank_check check (length(trim(code)) > 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_product_variants
    add constraint wa_product_variants_stock_non_negative_check check (stock_quantity >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_product_variants
    add constraint wa_product_variants_price_non_negative_check check (price >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_product_variants
    add constraint wa_product_variants_sku_not_blank_check check (length(trim(sku)) > 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_order_items
    add constraint wa_order_items_totals_non_negative_check
    check (unit_price >= 0 and line_total >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_orders
    add constraint wa_orders_status_check
    check (status in (
      'PENDING_OWNER_CONFIRMATION',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'COMPLETED',
      'REJECTED',
      'CANCELLED'
    ));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_orders
    add constraint wa_orders_totals_non_negative_check
    check (subtotal >= 0 and delivery_fee >= 0 and total >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_stock_reservations
    add constraint wa_stock_reservations_status_check
    check (status in ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wa_order_notifications
    add constraint wa_order_notifications_status_check
    check (status in ('PENDING', 'SENT', 'FAILED', 'RETRYABLE', 'TEMPLATE_REQUIRED', 'SKIPPED'));
exception
  when duplicate_object then null;
end $$;

create index if not exists wa_stock_reservations_business_stock_active_idx
  on public.wa_stock_reservations (business_id, product_variant_id, status, expires_at);

create unique index if not exists wa_product_variants_unique_option_combo_idx
  on public.wa_product_variants (business_id, product_id, selected_option_value_ids);

create index if not exists wa_processed_messages_business_customer_idx
  on public.wa_processed_messages (business_id, customer_phone, created_at desc);

create or replace function public.wa_create_pending_order(
  p_business_id text,
  p_idempotency_key text,
  p_order jsonb,
  p_items jsonb,
  p_reservations jsonb
)
returns table (
  id uuid,
  order_number text,
  duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.wa_orders%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_reservation jsonb;
  v_stock_id text;
  v_requested_quantity integer;
  v_stock_quantity integer;
  v_active_reserved integer;
begin
  perform pg_advisory_xact_lock(hashtext('wa_create_pending_order'), hashtext(p_idempotency_key));

  select *
    into v_existing
    from public.wa_orders as o
   where o.idempotency_key = p_idempotency_key
   limit 1;

  if found then
    id := v_existing.id;
    order_number := v_existing.order_number;
    duplicate := true;
    return next;
    return;
  end if;

  update public.wa_stock_reservations as sr
     set status = 'EXPIRED'
   where sr.business_id = p_business_id
     and sr.status = 'ACTIVE'
     and sr.expires_at <= now();

  for v_reservation in select * from jsonb_array_elements(p_reservations)
  loop
    v_stock_id := v_reservation->>'productVariantId';
    v_requested_quantity := (v_reservation->>'quantity')::integer;

    if v_stock_id is null or v_stock_id = '' or v_requested_quantity is null or v_requested_quantity <= 0 then
      raise exception 'Invalid stock reservation request.';
    end if;

    select pv.stock_quantity
      into v_stock_quantity
      from public.wa_product_variants as pv
     where pv.id = v_stock_id
       and pv.business_id = p_business_id
       and pv.is_available = true
     for update;

    if not found then
      select p.stock_quantity
        into v_stock_quantity
        from public.wa_products as p
       where p.id = v_stock_id
         and p.business_id = p_business_id
         and p.is_active = true
         and p.is_available = true
       for update;
    end if;

    if not found then
      raise exception 'Requested item is not available.';
    end if;

    select coalesce(sum(sr.quantity), 0)::integer
      into v_active_reserved
      from public.wa_stock_reservations as sr
     where sr.business_id = p_business_id
       and sr.product_variant_id = v_stock_id
       and sr.status = 'ACTIVE'
       and sr.expires_at > now();

    if v_requested_quantity > greatest(0, v_stock_quantity - v_active_reserved) then
      raise exception 'Insufficient stock for reservation %.%', v_stock_id, v_requested_quantity;
    end if;
  end loop;

  v_order_id := gen_random_uuid();
  v_order_number := 'DA-' || lpad(nextval('public.wa_order_number_seq')::text, 6, '0');

  insert into public.wa_orders (
    id,
    business_id,
    order_number,
    idempotency_key,
    customer_name,
    customer_phone,
    alternate_phone,
    language,
    status,
    fulfillment_method,
    delivery_area_id,
    delivery_address,
    delivery_latitude,
    delivery_longitude,
    pickup_location_id,
    payment_method,
    notes,
    subtotal,
    delivery_fee,
    total
  )
  values (
    v_order_id,
    p_business_id,
    v_order_number,
    p_idempotency_key,
    p_order->>'customerName',
    p_order->>'customerPhone',
    nullif(p_order->>'alternatePhone', ''),
    p_order->>'language',
    'PENDING_OWNER_CONFIRMATION',
    p_order->>'fulfillmentMethod',
    nullif(p_order->>'deliveryAreaId', ''),
    nullif(p_order->>'deliveryAddress', ''),
    nullif(p_order->>'deliveryLatitude', '')::numeric,
    nullif(p_order->>'deliveryLongitude', '')::numeric,
    nullif(p_order->>'pickupLocationId', ''),
    p_order->>'paymentMethod',
    nullif(p_order->>'notes', ''),
    (p_order->>'subtotal')::numeric,
    (p_order->>'deliveryFee')::numeric,
    (p_order->>'total')::numeric
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.wa_order_items (
      order_id,
      product_id,
      variant_id,
      product_code,
      product_name,
      selected_options,
      custom_field_answers,
      quantity,
      unit_price,
      line_total
    )
    values (
      v_order_id,
      v_item->>'productId',
      nullif(v_item->>'variantId', ''),
      v_item->>'productCode',
      v_item->>'productName',
      coalesce(v_item->'selectedOptions', '[]'::jsonb),
      coalesce(v_item->'customFieldAnswers', '[]'::jsonb),
      (v_item->>'quantity')::integer,
      (v_item->>'unitPrice')::numeric,
      (v_item->>'lineTotal')::numeric
    );
  end loop;

  for v_reservation in select * from jsonb_array_elements(p_reservations)
  loop
    insert into public.wa_stock_reservations (
      business_id,
      order_id,
      product_variant_id,
      quantity,
      status,
      expires_at
    )
    values (
      p_business_id,
      v_order_id,
      v_reservation->>'productVariantId',
      (v_reservation->>'quantity')::integer,
      'ACTIVE',
      (v_reservation->>'expiresAt')::timestamptz
    );
  end loop;

  id := v_order_id;
  order_number := v_order_number;
  duplicate := false;
  return next;
end;
$$;

grant execute on function public.wa_create_pending_order(text, text, jsonb, jsonb, jsonb) to service_role;


-- ============================================================
-- Source: supabase\wa_owner_notifications_schema.sql
-- ============================================================

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


-- ============================================================
-- Source: supabase\wa_bot_flow_settings_schema.sql
-- ============================================================

create table if not exists public.wa_bot_flow_settings (
  business_id text primary key references public.wa_businesses(id) on delete cascade,
  language_selection_enabled boolean not null default true,
  default_language text not null default 'en',
  welcome_message_english text not null default 'How can we help?',
  welcome_message_arabic text not null default U&'\0643\064a\0641 \064a\0645\0643\0646\0646\0627 \0645\0633\0627\0639\062f\062a\0643\061f',
  order_button_english text not null default 'Place an order',
  order_button_arabic text not null default U&'\062a\0642\062f\064a\0645 \0637\0644\0628',
  question_button_english text not null default 'Ask a question',
  question_button_arabic text not null default U&'\0637\0631\062d \0633\0624\0627\0644',
  question_response_english text not null default 'Send us your question here and our team will reply shortly.',
  question_response_arabic text not null default U&'\0627\0631\0633\0644 \0633\0624\0627\0644\0643 \0647\0646\0627 \0648\0633\064a\0631\062f \0641\0631\064a\0642\0646\0627 \0642\0631\064a\0628\0627.',
  info_button_english text not null default 'Store information',
  info_button_arabic text not null default U&'\0645\0639\0644\0648\0645\0627\062a \0627\0644\0645\062a\062c\0631',
  info_response_english text not null default 'We are open daily. Send a message here if you need help.',
  info_response_arabic text not null default U&'\0646\062d\0646 \0645\062a\0627\062d\0648\0646 \064a\0648\0645\064a\0627. \0627\0631\0633\0644 \0631\0633\0627\0644\0629 \0647\0646\0627 \0625\0630\0627 \0627\062d\062a\062c\062a \0645\0633\0627\0639\062f\0629.',
  browse_routes jsonb not null default '[{"key":"categories","source":"categories","label":{"en":"Categories","ar":"\u0627\u0644\u0641\u0626\u0627\u062a"},"active":true,"sortOrder":1}]'::jsonb,
  checkout_prompt_overrides jsonb not null default '{}'::jsonb,
  show_product_details_before_ordering boolean not null default true,
  auto_use_saved_checkout_details boolean not null default false,
  skip_fulfillment_when_single_option boolean not null default true,
  skip_delivery_area_when_single_option boolean not null default true,
  skip_pickup_location_when_single_option boolean not null default true,
  skip_payment_when_single_option boolean not null default true,
  order_notes_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wa_bot_flow_settings
  add column if not exists question_response_english text not null default 'Send us your question here and our team will reply shortly.',
  add column if not exists question_response_arabic text not null default U&'\0627\0631\0633\0644 \0633\0624\0627\0644\0643 \0647\0646\0627 \0648\0633\064a\0631\062f \0641\0631\064a\0642\0646\0627 \0642\0631\064a\0628\0627.',
  add column if not exists info_response_english text not null default 'We are open daily. Send a message here if you need help.',
  add column if not exists info_response_arabic text not null default U&'\0646\062d\0646 \0645\062a\0627\062d\0648\0646 \064a\0648\0645\064a\0627. \0627\0631\0633\0644 \0631\0633\0627\0644\0629 \0647\0646\0627 \0625\0630\0627 \0627\062d\062a\062c\062a \0645\0633\0627\0639\062f\0629.',
  add column if not exists browse_routes jsonb not null default '[{"key":"categories","source":"categories","label":{"en":"Categories","ar":"\u0627\u0644\u0641\u0626\u0627\u062a"},"active":true,"sortOrder":1}]'::jsonb,
  add column if not exists checkout_prompt_overrides jsonb not null default '{}'::jsonb;

alter table public.wa_bot_flow_settings enable row level security;

grant select, insert, update, delete on public.wa_bot_flow_settings to service_role;


-- ============================================================
-- Source: supabase\wa_flow_templates_schema.sql
-- ============================================================

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
  check (category in ('ECOMMERCE', 'RESTAURANT', 'GREETING_STORE_INFO', 'STANDARD_ONLINE_STORE', 'JEWELRY', 'CLOTHING', 'ACCESSORIES', 'CUSTOM_PRODUCTS'))
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


-- ============================================================
-- Source: supabase\wa_internal_admin_schema.sql
-- ============================================================

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


-- ============================================================
-- Source: supabase\wa_meta_app_review_schema.sql
-- ============================================================

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

