-- Partner-only sample catalog.
-- Safe to run multiple times.
-- This file creates sample rows under double-a-partner-test-business only.

begin;

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
  'double-a-partner-test-business',
  'Double A Partner Test Business',
  'en',
  'USD',
  true,
  true,
  0,
  'The store will review and confirm your order shortly.',
  'The store will review and confirm your order shortly.',
  true,
  true
)
on conflict (id) do nothing;

insert into public.wa_categories (
  id,
  business_id,
  name_english,
  name_arabic,
  is_active,
  sort_order
)
values
  (
    'partner-cat-test',
    'double-a-partner-test-business',
    'Partner Test Category',
    'Partner Test Category',
    true,
    1
  )
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
  image_url,
  is_active,
  is_available,
  stock_quantity,
  sort_order
)
values
  (
    'partner-product-test',
    'double-a-partner-test-business',
    'partner-cat-test',
    'PARTNER-001',
    'Partner Test Product',
    'Partner Test Product',
    'Test product for the partner bot.',
    'Test product for the partner bot.',
    10.00,
    null,
    true,
    true,
    10,
    1
  )
on conflict (id) do update set
  business_id = excluded.business_id,
  category_id = excluded.category_id,
  code = excluded.code,
  name_english = excluded.name_english,
  name_arabic = excluded.name_arabic,
  description_english = excluded.description_english,
  description_arabic = excluded.description_arabic,
  price = excluded.price,
  image_url = excluded.image_url,
  is_active = excluded.is_active,
  is_available = excluded.is_available,
  stock_quantity = excluded.stock_quantity,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
