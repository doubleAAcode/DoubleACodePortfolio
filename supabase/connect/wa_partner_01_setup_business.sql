-- Partner-only business and checkout setup.
-- Safe to run multiple times.
-- This file does not edit double-a-test-business.

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
  (
    'partner-delivery-standard',
    'double-a-partner-test-business',
    'Standard Delivery',
    'Standard Delivery',
    0,
    true,
    1
  )
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
  (
    'partner-pickup-main',
    'double-a-partner-test-business',
    'Main Pickup',
    'Main Pickup',
    'Main branch',
    'Main branch',
    true,
    1
  )
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
  (
    'partner-payment-cash',
    'double-a-partner-test-business',
    'Cash',
    'Cash',
    array['delivery', 'pickup'],
    true,
    1
  )
on conflict (id) do update set
  business_id = excluded.business_id,
  label_english = excluded.label_english,
  label_arabic = excluded.label_arabic,
  fulfillment_methods = excluded.fulfillment_methods,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
