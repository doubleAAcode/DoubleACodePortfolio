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
  category_id text not null references public.wa_categories(id) on delete restrict,
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
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- No anon/auth policies are created on purpose.
-- The bot reads these tables only from server code using SUPABASE_SERVICE_ROLE_KEY.
