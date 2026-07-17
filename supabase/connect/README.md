# Connect Supabase Schemas

The existing `wa_*` tables remain the source of truth for WhatsApp, catalog,
flows, checkout, orders, and diagnostics. New Flow Manager migrations must be
additive and must reuse `wa_businesses.id` as the tenant key.

## Flow Manager operations migration

Run `wa_flow_manager_core_schema.sql` after the catalog, WhatsApp connection,
internal-admin, flow-template, and bot-core schemas listed at the top of that
file.

The migration is idempotent and adds:

- workspace display metadata and Viewer role support;
- contacts and tags separate from checkout profiles;
- durable inbox conversations, messages, and audit events;
- canned replies;
- tenant-owned image, document, and prerecorded-audio assets;
- a backfill from existing checkout customer profiles.

RLS is enabled without browser-facing policies. Connect server routes use the
existing Supabase service-role environment variables and must authorize the
business before every query or mutation.

After the core schema, run `wa_messaging_operations_rpc.sql`. It adds the
atomic inbound-message ingest and processing lease used by the live Meta
webhook, plus monotonic outbound delivery-status updates. Deploy this database
migration before deploying application code that calls these RPCs.

Existing deployments created before the inbound provider smoke must then run
`wa_messaging_operations_rpc_message_id_fix.sql`. It replaces only the ingest
function, preserving its signature and service-role-only grant while removing
an ambiguous PL/pgSQL `message_id` conflict target found by real webhook retries.

Do not use `wa_conversation_sessions` as an inbox or `wa_message_events` as the
durable customer timeline. Their runtime and diagnostic responsibilities remain
separate.
