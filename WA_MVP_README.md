# WhatsApp MVP Bot Setup

This project now contains the single-business WhatsApp MVP bot.

## Routes

- Webhook: `/api/whatsapp/webhook`
- Dashboard: `/dashboard`
- Webhook logs: `/logsWABot`

There are no partner `-2` routes in this project.

## Required Vercel environment variables

Set these in the Vercel project that deploys this site:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_GRAPH_API_VERSION` optional, defaults in code
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WA_DASHBOARD_USERNAME`
- `WA_DASHBOARD_PASSWORD`
- `WA_DASHBOARD_SESSION_SECRET`

## New Supabase account setup order

Create a new Supabase project, then run these files in the SQL editor in this order:

1. `supabase/wa_bot_core_schema.sql`
2. `supabase/wa_catalog_settings_schema.sql`
3. `supabase/wa_order_lifecycle_schema.sql`
4. `supabase/wa_reliability_hardening.sql`
5. `supabase/wa_webhook_logs_schema.sql`
6. `supabase/wa_order_decision_rpc_fix.sql`
7. `supabase/wa_bot_flow_settings_schema.sql`

After that, copy the new project's `SUPABASE_URL` and `service_role` secret into Vercel.

## Meta setup

Use the deployed site URL as the callback:

`https://YOUR-DOMAIN.com/api/whatsapp/webhook`

Use the exact same value from `WHATSAPP_VERIFY_TOKEN` as the Meta verify token.

Subscribe the app to the WABA `messages` field after webhook verification.
