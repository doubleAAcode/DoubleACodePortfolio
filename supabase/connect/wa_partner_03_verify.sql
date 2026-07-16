-- Partner-only verification queries.
-- These queries do not change data.

select id, name, is_active, updated_at
from public.wa_businesses
where id = 'double-a-partner-test-business';

select id, name_english, is_active, sort_order
from public.wa_categories
where business_id = 'double-a-partner-test-business'
order by sort_order, name_english;

select id, code, name_english, price, stock_quantity, is_active, is_available
from public.wa_products
where business_id = 'double-a-partner-test-business'
order by sort_order, code;

select id, name_english, delivery_fee, is_active
from public.wa_delivery_areas
where business_id = 'double-a-partner-test-business'
order by sort_order, name_english;

select id, name_english, address_english, is_active
from public.wa_pickup_locations
where business_id = 'double-a-partner-test-business'
order by sort_order, name_english;

select id, label_english, fulfillment_methods, is_active
from public.wa_payment_methods
where business_id = 'double-a-partner-test-business'
order by sort_order, label_english;

select order_number, customer_name, customer_phone, status, total, created_at
from public.wa_orders
where business_id = 'double-a-partner-test-business'
order by created_at desc
limit 20;

select customer_phone, current_step, updated_at
from public.wa_conversation_sessions
where business_id = 'double-a-partner-test-business'
order by updated_at desc
limit 20;

select *
from public.wa_webhook_logs
where url like '%/api/whatsapp/webhook-2%'
order by created_at desc
limit 50;
