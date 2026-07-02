# WhatsApp Partner Testing Guide

This guide explains how the second WhatsApp bot can be tested without damaging or overwriting the main bot data.

## Golden Rule

The second bot must use its own WhatsApp environment variables and its own Supabase `business_id`.

Main bot:

```txt
WHATSAPP_BUSINESS_ID=double-a-test-business
```

Partner bot:

```txt
WHATSAPP_BUSINESS_ID_2=double-a-partner-test-business
```

Do not run SQL that updates or deletes rows for `double-a-test-business` unless Hussein explicitly asks for it.

## Webhook URL

Use this URL in the partner Meta app webhook settings:

```txt
https://www.doubleacode.com/api/whatsapp/webhook-2
```

Do not use the main webhook URL for partner testing:

```txt
https://www.doubleacode.com/api/whatsapp/webhook
```

## Partner Dashboard URL

Use this dashboard for partner catalog and orders:

```txt
https://www.doubleacode.com/dashboard-2
```

Do not use the main dashboard for partner testing:

```txt
https://www.doubleacode.com/dashboard
```

The partner dashboard has the same owner features as the main dashboard:

```txt
Overview
Categories
Products
Orders
Delivery
Settings
Simulator
```

The partner dashboard reads and writes rows for:

```txt
double-a-partner-test-business
```

The main dashboard reads and writes rows for:

```txt
double-a-test-business
```

## Required Vercel Environment Variables

The partner bot must use `_2` variables only:

```txt
WHATSAPP_ACCESS_TOKEN_2=
WHATSAPP_PHONE_NUMBER_ID_2=
WHATSAPP_BUSINESS_ACCOUNT_ID_2=
WHATSAPP_VERIFY_TOKEN_2=
WHATSAPP_APP_SECRET_2=
WHATSAPP_BUSINESS_ID_2=double-a-partner-test-business
```

Optional:

```txt
WHATSAPP_GRAPH_API_VERSION_2=
```

Never replace the main variables while testing the partner app:

```txt
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID
WHATSAPP_VERIFY_TOKEN
WHATSAPP_APP_SECRET
WHATSAPP_BUSINESS_ID
```

## Required Partner Dashboard Environment Variables

The partner dashboard must use `_2` dashboard variables:

```txt
WA_DASHBOARD_USERNAME_2=owner
WA_DASHBOARD_PASSWORD_2=
WA_DASHBOARD_SESSION_SECRET_2=
WA_DASHBOARD_BUSINESS_ID_2=double-a-partner-test-business
```

Use a strong random value for `WA_DASHBOARD_SESSION_SECRET_2`. It is not from Meta or Supabase; you create it.

Never replace the main dashboard variables while testing the partner dashboard:

```txt
WA_DASHBOARD_USERNAME
WA_DASHBOARD_PASSWORD
WA_DASHBOARD_SESSION_SECRET
WA_DASHBOARD_BUSINESS_ID
```

## What Is Isolated

The partner setup has separate:

```txt
WhatsApp webhook route
WhatsApp Meta credentials
Dashboard route
Dashboard login cookie
Dashboard password/session secret
Supabase business_id
Catalog rows
Customer sessions
Customer saved profiles
Orders
Stock reservations
Processed message dedupe rows
Order accept/reject WhatsApp notifications
```

Shared infrastructure:

```txt
Same codebase
Same Vercel project
Same Supabase project
Same webhook logs table
Same uploaded image storage bucket/path style
```

Shared infrastructure is safe as long as every partner data query uses `double-a-partner-test-business`.

## Supabase Safety

The project uses one Supabase database, but bot data is separated by `business_id`.

Partner-safe business id:

```txt
double-a-partner-test-business
```

Main business id:

```txt
double-a-test-business
```

Before running any SQL, check that every query targets the partner business id.

Safe pattern:

```sql
where business_id = 'double-a-partner-test-business'
```

Dangerous pattern:

```sql
where business_id = 'double-a-test-business'
```

Very dangerous pattern:

```sql
delete from public.wa_products;
update public.wa_products set ...;
delete from public.wa_orders;
update public.wa_orders set ...;
```

Never run update/delete statements without a `where business_id = 'double-a-partner-test-business'` filter.

## Tables That Must Stay Scoped

When adding, editing, or deleting test data, use `double-a-partner-test-business` in these tables:

```txt
wa_businesses
wa_categories
wa_products
wa_product_options
wa_product_option_values
wa_product_variants
wa_product_custom_fields
wa_delivery_areas
wa_pickup_locations
wa_payment_methods
wa_conversation_sessions
wa_customer_profiles
wa_orders
wa_stock_reservations
wa_processed_messages
```

`wa_webhook_logs` is shared. That is okay because it is only logs. Filter by URL when checking partner logs:

```sql
select *
from public.wa_webhook_logs
where url like '%/api/whatsapp/webhook-2%'
order by created_at desc
limit 50;
```

## Safe Partner Business Setup

The schema includes a partner business row:

```txt
double-a-partner-test-business
```

If the partner bot has no products, that is expected until partner catalog rows are added under the partner business id.

Example category insert:

```sql
insert into public.wa_categories (
  id,
  business_id,
  name_english,
  name_arabic,
  is_active,
  sort_order
)
values (
  'partner-cat-test',
  'double-a-partner-test-business',
  'Test Category',
  'Test Category',
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
```

Example product insert:

```sql
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
values (
  'partner-product-test',
  'double-a-partner-test-business',
  'partner-cat-test',
  'PARTNER-001',
  'Partner Test Product',
  'Partner Test Product',
  'Test product for partner bot.',
  'Test product for partner bot.',
  10.00,
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
  is_active = excluded.is_active,
  is_available = excluded.is_available,
  stock_quantity = excluded.stock_quantity,
  sort_order = excluded.sort_order,
  updated_at = now();
```

## Safe Testing Checklist

1. Meta webhook URL is `/api/whatsapp/webhook-2`.
2. Meta verify token matches `WHATSAPP_VERIFY_TOKEN_2`.
3. Vercel has all `_2` variables set.
4. `WHATSAPP_BUSINESS_ID_2` is `double-a-partner-test-business`.
5. `WA_DASHBOARD_BUSINESS_ID_2` is `double-a-partner-test-business`.
6. Partner uses `/dashboard-2`, not `/dashboard`.
7. SQL inserts/updates/deletes use `business_id = 'double-a-partner-test-business'`.
8. Test WhatsApp messages create logs for `/api/whatsapp/webhook-2`.
9. Test orders appear with `business_id = 'double-a-partner-test-business'`.

## Quick Verification Queries

Check partner products:

```sql
select id, code, name_english, stock_quantity
from public.wa_products
where business_id = 'double-a-partner-test-business'
order by sort_order;
```

Check partner sessions:

```sql
select customer_phone, current_step, updated_at
from public.wa_conversation_sessions
where business_id = 'double-a-partner-test-business'
order by updated_at desc
limit 20;
```

Check partner orders:

```sql
select order_number, customer_name, customer_phone, status, total, created_at
from public.wa_orders
where business_id = 'double-a-partner-test-business'
order by created_at desc
limit 20;
```

Check that main data was not touched:

```sql
select count(*) as main_order_count
from public.wa_orders
where business_id = 'double-a-test-business';
```
