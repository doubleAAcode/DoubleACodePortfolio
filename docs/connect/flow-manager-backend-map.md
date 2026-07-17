# Flow Manager Backend Map

This document maps the exact Lovable Flow Manager screens to the existing
Connect backend. `flow-manager/` remains the canonical UI source. Adapters may
replace mock data and handlers, but they do not replace the supplied screen
composition.

## Status meanings

- **Existing**: the server capability and Supabase tables already exist.
- **Schema added**: the additive Flow Manager schema now exists, but the screen
  adapter is not complete.
- **Derived**: no source-of-truth table is needed; the UI should calculate a
  read model from operational tables.
- **New domain**: a later migration and service are required.
- **Future**: visible preview only and no real mutations.

## Admin routes

| Lovable route           | Backend source                                        | Status            |
| ----------------------- | ----------------------------------------------------- | ----------------- |
| Overview                | Businesses, connections, orders, webhook/message logs | Derived           |
| Live Operations / Inbox | Contacts, conversations, messages, events             | Schema added      |
| Businesses              | `wa_businesses`, `wa_business_users`                  | Existing          |
| Business WhatsApp       | `wa_whatsapp_connections`                             | Existing          |
| Business Catalog        | Categories, catalog groups, products, variants        | Existing          |
| Business Checkout       | Delivery, pickup, payment choices, bot settings       | Existing          |
| Business Flow Builder   | Business flows and immutable versions                 | Existing          |
| Business Diagnostics    | Webhook logs, message events, sessions, orders        | Existing          |
| Contacts                | Contacts, tags, orders, conversation history          | Schema added      |
| Flow Templates          | Flow templates and immutable versions                 | Existing          |
| WhatsApp Templates      | `wa_meta_templates` plus Meta status refresh          | Existing, partial |
| Broadcasts              | Broadcasts, audiences, recipients, delivery jobs      | New domain        |
| Analytics               | Conversations, messages, orders, template outcomes    | Derived           |
| Logs                    | Webhook logs, message events, admin audit logs        | Existing          |
| Team                    | `wa_business_users` with Flow Manager role metadata   | Schema added      |
| Developers              | API keys and outgoing webhooks                        | Future            |

## Client routes

| Lovable route | Backend source                                                         | Status                             |
| ------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| Home          | Conversations, messages, orders, flow versions, connection health      | Derived                            |
| Inbox         | Contacts, conversations, messages, events, canned replies              | Schema added                       |
| Contacts      | Contacts, tags, attributes, opt-in, order totals                       | Schema added                       |
| Broadcasts    | Broadcasts, audiences, recipients, delivery jobs                       | New domain                         |
| Automations   | Business flow and immutable flow versions                              | Existing                           |
| Templates     | Meta WhatsApp templates                                                | Existing, partial                  |
| Catalog       | Categories, products, options, variants, stock                         | Existing                           |
| Analytics     | Conversations, messages, orders, template outcomes                     | Derived                            |
| Settings      | Business, users, checkout and notification settings                    | Existing, partial                  |
| AI Agent      | None in current phase                                                  | Future                             |
| Voice         | Tenant media for prerecorded audio; calls and generated voice excluded | Future preview; media schema added |
| Payments      | Existing order payment-method choice only; payment requests excluded   | Future                             |
| Channels      | WhatsApp connection only                                               | Future for other channels          |
| Integrations  | None in current phase                                                  | Future                             |
| Developers    | None in current phase                                                  | Future                             |
| Enterprise    | None in current phase                                                  | Future                             |

## Migration order

1. Keep the existing businesses, WhatsApp, catalog, order, flow, and logging
   schemas authoritative.
2. Apply `supabase/connect/wa_flow_manager_core_schema.sql` for durable contacts,
   inbox operations, team metadata, and tenant-owned media.
3. Apply `supabase/connect/wa_messaging_operations_rpc.sql`, its deployed
   function repair, and `wa_conversation_runtime_linkage_rpc.sql` for atomic
   inbound persistence and runtime linkage.
4. Apply `supabase/connect/wa_human_operations_outbox.sql`, followed by
   `wa_human_operations_retry_reconciliation.sql`, before deploying human-send
   or worker routes.
5. Dual-write inbound and outbound WhatsApp activity into the durable inbox
   while retaining `wa_message_events` as the diagnostic audit stream.
6. Connect the exact Inbox and Contacts screens to server-only tenant-scoped
   adapters.
7. Connect the exact Automations screen to canonical business flow documents,
   validation, drafts, publishing, and runtime traces.
8. Connect catalog, orders, templates, settings, and derived dashboards.
9. Add compliant broadcasts only after contacts, opt-in evidence, templates,
   and the message outbox are production-ready.

## Boundary rules

- `wa_conversation_sessions` is runtime state, not an operator inbox.
- `wa_message_events` is a sanitized diagnostic log, not the durable message
  timeline.
- `wa_customer_profiles` stores reusable checkout details; `wa_contacts` is the
  general contact domain.
- Flow JSON never controls trusted pricing, stock, totals, tenancy, order IDs,
  or order-state transitions.
- Browser code never receives the Supabase service-role key. Every query and
  mutation goes through an authenticated server adapter scoped to a business.
