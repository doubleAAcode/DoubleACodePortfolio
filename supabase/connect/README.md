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

Run `wa_conversation_runtime_linkage_rpc.sql` before deploying the webhook
runtime-linkage hook. It tenant-validates the pinned business flow/version,
updates the durable conversation pointers atomically, and records idempotent
`FLOW_STARTED` and human-handoff `FLOW_STOPPED` timeline events.

Run `wa_conversation_lifecycle_rpc.sql` before deploying conversation `PATCH`
or lifecycle-worker routes. It adds atomic `OPEN`, `PENDING`, `SNOOZED`, and
`CLOSED` transitions, idempotent audit events, customer-inbound wake behavior,
and due-snooze claiming. Manual changes are shared by admin and client adapters;
the due worker requires an internal-admin session or a server-only Connect
worker bearer.

Run `wa_human_operations_outbox.sql` before deploying the human-reply command
routes. It adds tenant-scoped outbox and attempt history, atomic idempotency
claims, and completion state transitions. Free-text replies are claimed only
inside the WhatsApp 24-hour customer-service window; outside it, the command is
persisted as blocked with `TEMPLATE_REQUIRED`. Both tables and RPCs are
service-role-only. Application sending also remains default-off unless the
server-only `CONNECT_HUMAN_SEND_ENABLED` variable is exactly `true`.

Run `wa_human_operations_retry_reconciliation.sql` immediately afterward and
before deploying the outbox processor routes. It adds due-retry claiming,
service-window revalidation, expired-lease quarantine, and audited manual
reconciliation. An expired `SENDING` lease is treated as an unknown provider
outcome and is never replayed automatically. The processor may be called by an
internal administrator or a scheduler bearing `CONNECT_WORKER_SECRET` (with
`CONNECT_HUMAN_WORKER_SECRET` retained as a rollout alias);
the scheduler and provider-send switch remain separate rollout controls.

Do not use `wa_conversation_sessions` as an inbox or `wa_message_events` as the
durable customer timeline. Their runtime and diagnostic responsibilities remain
separate.
