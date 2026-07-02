-- Partner-only cleanup.
-- This deletes partner bot rows only.
-- Do not run this unless you intentionally want to reset partner test data.
-- This file does not delete double-a-test-business rows.

begin;

delete from public.wa_stock_reservations
where business_id = 'double-a-partner-test-business';

delete from public.wa_order_items
where order_id in (
  select id
  from public.wa_orders
  where business_id = 'double-a-partner-test-business'
);

delete from public.wa_orders
where business_id = 'double-a-partner-test-business';

delete from public.wa_customer_profiles
where business_id = 'double-a-partner-test-business';

delete from public.wa_processed_messages
where business_id = 'double-a-partner-test-business';

delete from public.wa_conversation_sessions
where business_id = 'double-a-partner-test-business';

delete from public.wa_product_custom_fields
where business_id = 'double-a-partner-test-business';

delete from public.wa_product_variants
where business_id = 'double-a-partner-test-business';

delete from public.wa_product_option_values
where option_id in (
  select id
  from public.wa_product_options
  where business_id = 'double-a-partner-test-business'
);

delete from public.wa_product_options
where business_id = 'double-a-partner-test-business';

delete from public.wa_products
where business_id = 'double-a-partner-test-business';

delete from public.wa_categories
where business_id = 'double-a-partner-test-business';

delete from public.wa_delivery_areas
where business_id = 'double-a-partner-test-business';

delete from public.wa_pickup_locations
where business_id = 'double-a-partner-test-business';

delete from public.wa_payment_methods
where business_id = 'double-a-partner-test-business';

-- Keep the partner business row so /dashboard-2 still has a business to load.
update public.wa_businesses
set
  name = 'Double A Partner Test Business',
  default_language = 'en',
  currency = 'USD',
  allow_delivery = true,
  allow_pickup = true,
  minimum_order_amount = 0,
  order_confirmation_message_english = 'The store will review and confirm your order shortly.',
  order_confirmation_message_arabic = 'The store will review and confirm your order shortly.',
  require_owner_approval = true,
  is_active = true,
  updated_at = now()
where id = 'double-a-partner-test-business';

commit;
