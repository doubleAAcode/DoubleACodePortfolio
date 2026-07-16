# Double A Connect Product Roadmap

Last updated: 2026-07-17

## Purpose

This file is the living source of truth for what Double A Connect currently
does, what the Flow Manager UI represents, and what must be built next. Update
it whenever a Connect capability is implemented, changed, verified, deferred,
or removed from scope.

The historical `.agents/ChatBot Plan.md` contains the original milestone-by-
milestone brainstorming. It remains useful background, but this file is the
current product roadmap.

## Document Control

| Control                  | Contract                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product owner            | Double A product owner approves scope, UX intent, and milestone acceptance.                                                                                    |
| Engineering owner        | Repository maintainer and Codex implement, test, deploy, and record evidence.                                                                                  |
| Planning method          | Dependency-ordered, milestone-gated delivery. Calendar estimates are added only when capacity and unknowns are understood.                                     |
| Active release           | Milestone 1 - WhatsApp Operations. No unrelated feature family may be promoted while it is active.                                                             |
| Source of truth          | This file controls product scope, milestone status, acceptance, and release evidence.                                                                          |
| Supporting specification | `docs/connect/flow-manager-backend-map.md` maps individual Flow Manager screens to authoritative backend domains.                                              |
| UI source                | `flow-manager/` is the canonical Lovable presentation source; the main application remains the deployment authority.                                           |
| Production origin        | `https://doubleacode.com` is the canonical deployed origin for browser, API, webhook, and release verification.                                                |
| Change rule              | Any Connect implementation that changes capability, scope, architecture, schema, verification, risk, or milestone status updates this file in the same change. |

Milestone status changes require product outcome evidence, not a percentage or
an implementation claim. A milestone remains active until its completion gate
passes in the deployed environment.

## Status Definitions

- **Live**: Real UI, backend, authorization, persistence, error handling, and
  proportionate tests are connected.
- **In progress**: A real vertical slice exists, but named requirements remain.
- **Foundation**: Working backend capability exists but is not yet exposed by
  the final Flow Manager experience.
- **Preview**: Clickable Lovable UI showing product intent. Data is illustrative
  and mutations do nothing.
- **Future**: Intentionally deferred beyond the WhatsApp-first roadmap.

## Current Product Direction

Double A Connect is a multi-business WhatsApp conversation, automation,
commerce, and support platform.

Current scope:

- WhatsApp only.
- Deterministic, testable conversation workflows before autonomous AI.
- A general WhatsApp workflow layer combined with protected commerce actions.
- A real admin console at `/connect/admin`.
- A real business workspace at `/connect/client`.
- Incoming voice notes may be transcribed to text and passed into the normal
  deterministic flow.
- Clients may upload prerecorded audio responses and use them in flow nodes.
- Future features remain clickable as clearly labeled UI previews.

Explicitly deferred:

- Autonomous AI agents and knowledge bases.
- AI-generated voice.
- Phone calls and AI call handling.
- Instagram, Messenger, email, SMS, and webchat.
- General integration marketplace.
- Native payment-provider platform.
- SSO, SCIM, compliance certification, and other enterprise expansion.

## Non-Negotiable Product Rules

1. The new Flow Manager UI is the target experience, not the current source of
   backend truth.
2. Existing tested Connect services remain authoritative during migration.
3. No mock screen may be represented as a live feature.
4. Future screens remain clickable and show a persistent `Future work` notice:
   `UI preview only. Data is illustrative, and actions do not save or send.`
5. Navigation, tabs, filters, and harmless preview interactions may work on a
   future screen. Mutating actions must do nothing and must not show fake
   success messages.
6. Published flow versions are immutable. Drafts are editable.
7. In-flight conversations remain pinned to the flow version they started on.
8. The visual flow never directly controls prices, inventory, totals, tenant
   access, order IDs, or order status transitions.
9. New Connect routes use the Flow Manager presentation and interaction system.
   Legacy route/page components must not be embedded or cosmetically wrapped in
   the new UI; only backend services, schemas, authorization, and domain helpers
   are reused.

## What We Have Today

### Live or working backend foundations

- [x] WhatsApp webhook verification and inbound event handling.
- [x] Multi-business routing by WhatsApp phone-number connection.
- [x] Outbound WhatsApp text, reply-button, list, and image messages.
- [x] Message-event recording with masked and hashed customer identifiers.
- [x] Duplicate webhook and duplicate order protections.
- [x] Retry classification, provider-error sanitization, and diagnostics.
- [x] Persistent conversation sessions for the deterministic commerce bot.
- [x] English and Arabic bot copy and language selection.
- [x] Categories, catalog groups, products, options, variants, custom fields,
      stock, and images.
- [x] Cart calculation and stock-aware quantity validation.
- [x] Delivery areas, pickup locations, payment-method choices, and checkout
      settings.
- [x] Atomic pending-order creation with idempotency and stock reservations.
- [x] Order acceptance, rejection, lifecycle transitions, history, and saved
      order snapshots.
- [x] Owner notification records, reminders, read state, and health checks.
- [x] Internal admin session, overview, business onboarding, status controls,
      business users, WhatsApp connection setup, and audit records.
- [x] Flow templates, draft versions, publishing, cloning to businesses, and
      business-specific versions.
- [x] Canonical v2 flow documents, legacy conversion, validation, protected
      commerce actions, and runtime compilation.
- [x] Business and conversation diagnostics, webhook logs, and message logs.
- [x] Meta WhatsApp template submission and local submission records.
- [x] Automated Connect suite: 40 tests passing on 2026-07-16.

### Working but temporary or incomplete product layers

- [~] The exact Flow Manager admin and client route trees now own
  `/connect/admin` and `/connect/client`. Their page data and actions are still
  illustrative previews until each screen receives a backend adapter.
- [x] The discarded custom Connect shell and canonical-editor approximation are
      no longer mounted. Legacy dashboard entry points redirect into the new client
      workspace, while existing backend services and APIs remain available for
      migration.
- [~] Existing admin and client authentication gates still use the deployed
  Vercel environment contracts. Local development also has a development-only
  `?preview=1` UI inspection path that is unavailable in production builds.
- [~] Client access still uses temporary environment-based credentials tied to
  configured businesses.
- [~] Deployed customer profiles are backfilled into the new tenant-scoped
  contact domain. Contact-management route adapters and operations remain
  pending.
- [~] The deployed schema now provides durable inbox conversations, messages,
  events, assignment fields, notes, tags, and canned replies. Webhook dual-write,
  human outbox, and route adapters remain pending.
- [~] The exact Flow Manager Automations list now reads the authorized
  business's canonical flow and version summary through the existing client
  API. The supplied Lovable canvas remains illustrative; real document mapping,
  draft save, validation, publishing, and execution metrics are still pending.
- [~] The exact Flow Manager admin Businesses list now reads real business,
  owner, WhatsApp connection, status, and setup data through the authenticated
  internal-admin API. Search, status filtering, row navigation, and the setup
  checklist are live; creation and configuration mutations remain pending.
- [~] The additive Flow Manager Supabase migration for tenant-scoped contacts,
  tags, durable inbox conversations/messages/events, canned replies, workspace
  role metadata, and reusable media assets was deployed and verified on
  2026-07-17. Route-level adapters remain pending.
- [x] The main project includes the cloned canvas dependency, `reactflow`;
      production build and typecheck pass locally.

### Flow Manager UI prototype

- [x] A separate Lovable-generated UI reference exists in `flow-manager/`.
- [x] It contains admin, client, flow-builder, inbox, contact, analytics,
      template, settings, and future-product screen designs.
- [x] Its exact route and presentation component tree is namespaced inside the
      main application and mounted under the Connect admin and client routes.
- [x] Prototype links are rebased under `/connect`; the nested project does not
      replace the main router, build, or deployment configuration.
- [~] Mock imports, hardcoded values, and local state are contained behind a
  persistent preview notice and mutation guard. They must be replaced screen by
  screen as real backend adapters are implemented.
- [x] Every incomplete Lovable destination and page is marked `Future` from a
      central route-status registry. Incomplete internal tabs inherit the same
      marker; routes graduate to live only after their reads, mutations,
      permissions, and tests are complete.
- [x] Fake prototype success toasts are disabled in the ported UI.

## Target Product Experience

### Admin workspace

Target route: `/connect/admin`

Live-target navigation:

- Overview
- Live Operations
- Businesses
- Contacts
- Flow Templates
- WhatsApp Templates
- Broadcasts
- Analytics
- Logs
- Settings

Admin outcomes:

- Onboard and suspend businesses safely.
- Configure WhatsApp connections and inspect their health.
- Create global flow templates and clone them to a business.
- Customize, validate, test, publish, and audit business flows.
- Inspect conversations across businesses and hand them to human operators.
- Manage WhatsApp templates and compliant broadcasts.
- Diagnose a customer session from webhook through flow and order execution.

### Client workspace

Target route: `/connect/client`

Live-target navigation:

- Home
- Inbox
- Contacts
- Flows
- Templates
- Catalog
- Orders
- Broadcasts
- WhatsApp
- Settings

Client outcomes:

- Operate one or more authorized business workspaces.
- Build and publish permitted business conversation flows.
- Reply to customers after handoff.
- Manage contacts, catalog, fulfillment, and orders.
- Upload reusable media and prerecorded audio responses.
- View WhatsApp connection health, message status, and practical analytics.

Future product navigation remains visible and clickable with Preview status.

## Conversation Workflow Target

The target builder is a WhatsApp-focused workflow system, not just a diagram
editor. It has two layers.

### General workflow layer

- Trigger a workflow manually, when a conversation opens, or when a matching
  WhatsApp message arrives.
- Send text, image, WhatsApp template, or prerecorded audio.
- Ask short-text, long-text, numeric, yes/no, or single-choice questions.
- Validate and store answers in typed conversation/contact fields.
- Branch by selected answer, contact field, conversation state, or order state.
- Update contact fields and tags.
- Assign or hand off to a human.
- Open or close a support conversation.
- Wait using a durable scheduler.
- Jump to another step or start a reusable subflow.
- End, restart, go back, or return to the main menu where valid.

### Protected commerce layer

- Browse categories or custom catalog groups.
- Select a product and display trusted product details.
- Select options and resolve a valid product variant.
- Collect custom product fields.
- Validate quantity against available stock.
- Add, update, remove, and review cart items.
- Collect delivery or pickup details.
- Collect a configured payment-method choice.
- Review the authoritative order summary.
- Create exactly one pending order.
- Notify the owner and customer without corrupting order state if sending fails.

Protected commerce nodes may expose safe configuration, but their server action
cannot be replaced or bypassed by flow JSON.

### Builder lifecycle

- Create from scratch or from a template.
- Drag, connect, duplicate, configure, and remove nodes.
- Edit English and Arabic copy.
- Save an editable draft.
- Show node-level validation errors and warnings.
- Test with the real runtime and controlled test contact.
- Publish an immutable version.
- Keep active conversations pinned to their original version.
- Inspect per-contact execution history, retries, failures, and current step.
- Stop or restart a workflow for a contact with audit history.
- Import and export a safe, versioned workflow document in a later phase.

## Backend Order Policy

Admin customization controls the ordering experience and constrained business
policies. The backend always controls order truth.

Admins may configure:

- Entry points and copy.
- Browse routes and optional informational steps.
- Required custom questions.
- Delivery, pickup, notes, saved-details reuse, and safe skip rules.
- Available configured payment methods.
- Owner approval requirements.
- Completion, cancellation, and handoff destinations.

Admins may not customize:

- Product prices, totals, or stock through flow JSON.
- Variant or inventory validation rules.
- Reservation commit and release behavior.
- Tenant ownership checks.
- Idempotency and duplicate prevention.
- Order numbering.
- Allowed order status transitions.
- Audit, retry, or notification-integrity rules.

Before creating an order, the server reloads trusted data, validates the cart,
recalculates totals, validates fulfillment, reserves stock, and creates one
order atomically.

## Audio Scope

### Prerecorded outbound responses

- Client uploads a supported recording to the business media library.
- Media is validated and stored with tenant ownership.
- A flow node references the media asset instead of an arbitrary external URL.
- The sender records delivery state in the same message timeline.

### Incoming voice notes

- Receive the WhatsApp audio event.
- Download media securely from Meta.
- Validate and store the original asset according to retention policy.
- Transcribe speech to text.
- Store the transcript beside the original message.
- Pass the transcript into the deterministic parser and active flow.
- Use an explicit retry/type-your-answer fallback when transcription is not
  usable.

Transcription converts input only. It does not choose actions or generate an AI
response.

## Delivery Baseline

This is the audited starting point for the roadmap. It distinguishes deployed
foundations from the final product experience.

| Area                 | Current baseline                                                                                                                                           | Target                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Product surface      | Exact Lovable admin/client route trees mounted below `/connect`; most routes are Preview/Future.                                                           | One coherent Flow Manager product with real, tenant-safe operations.                         |
| Connected UI         | Admin Businesses and client Automations have partial real adapters.                                                                                        | Each route graduates independently only after its full journey passes.                       |
| WhatsApp             | Verified webhook, phone-number routing, deterministic processing, sender, diagnostics, and new durable inbound persistence code.                           | Durable inbox, human operations, statuses, flows, media, templates, and broadcasts.          |
| Database             | Existing `wa_*` commerce/runtime domains plus deployed additive Flow Manager inbox/contact tables and messaging RPCs.                                      | Versioned, tenant-scoped domains with migration and rollback evidence.                       |
| Authentication       | HMAC-signed, environment-backed internal-admin and client cookies. Client sessions are tied to one configured business.                                    | Database-backed users, workspace memberships, role enforcement, rotation, and audit.         |
| Deployment           | Main TanStack Start app deploys to Vercel; Supabase is the operational database; Meta Cloud API is the provider.                                           | Repeatable local, preview, and production release ladder with smoke and rollback procedures. |
| Legacy compatibility | Database connection lookup falls back to legacy suffixed Vercel WhatsApp variables. Existing APIs and services remain available behind redirects/adapters. | Database-owned connections and new UI, with fallback removed only after measured cutover.    |
| Verified baseline    | Typecheck, scoped ESLint, 42 Connect tests, production build, live SQL checks, and prior desktop/mobile browser checks pass.                               | Every milestone adds automated, browser, database, and real-provider evidence.               |

Known release gap: the Milestone 1A code and live RPCs have not yet completed a
Vercel deployment plus real Meta inbound/status smoke test. That is the next
release gate, not a completed capability.

## Technology Stack

The main repository, not the nested Lovable package, defines production
versions and deployment behavior.

| Layer              | Current technology                                                                                               | Ownership and constraints                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Language           | TypeScript 5.8, strict mode, ES2022 target                                                                       | Shared across routes, server services, tests, and UI.                                     |
| Web application    | React 19, TanStack Start/Router, Vite 7, Nitro                                                                   | One application owns public pages and Connect. Vercel recognizes `tanstack-start`.        |
| Client data        | TanStack Query                                                                                                   | Browser state must not become a second source of domain truth.                            |
| UI system          | Lovable source, Tailwind CSS 4, Radix UI, Lucide, React Flow/XYFlow                                              | Preserve the supplied composition; adapters replace mocks and handlers.                   |
| Server             | TanStack server routes/functions on the Vercel runtime                                                           | Secrets and tenant authorization remain server-only.                                      |
| Database           | Supabase Postgres, REST, SQL RPCs, RLS                                                                           | Server uses `service_role`; authenticated route code must authorize before every query.   |
| Messaging provider | Meta WhatsApp Cloud API, configurable Graph API version, default `v23.0`                                         | Webhooks are untrusted until verified; sends and statuses require idempotent persistence. |
| Authentication     | HMAC-signed HttpOnly cookies; environment-backed accounts                                                        | Temporary foundation to be replaced in Milestone 4.                                       |
| Testing            | Node test runner, TypeScript, ESLint, Vite production build, browser verification, live SQL/provider smoke tests | Verification depth scales with the changed boundary.                                      |
| Delivery           | npm lockfile, Vercel application deploys, ordered Supabase SQL migrations                                        | Database is migrated before application code that depends on it.                          |

Stack debt to resolve:

- [ ] Pin the supported Node runtime in `package.json` and Vercel instead of
      relying only on `@types/node` and the host default.
- [ ] Align the nested `flow-manager/` dependency versions with the main app
      when refreshing the UI; never install or deploy it as a second product.
- [ ] Establish and document a separate non-production Supabase/Meta test
      environment before a milestone introduces destructive migration risk.
- [ ] Decide whether the final canvas standard is `@xyflow/react`; remove the
      duplicate `reactflow` package only after the Lovable port and canonical
      flow adapter no longer require both.

## Repository Ownership Map

| Path                                    | Responsibility                                                  | Change rule                                                                   |
| --------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `flow-manager/`                         | Canonical Lovable UI source/reference                           | Refresh from source; do not add production backend logic here.                |
| `src/routes/connect*`                   | Integrated admin/client Flow Manager routes                     | Use the Lovable screen composition and server adapters.                       |
| `src/routes/api.connect*`               | Public Connect server endpoint boundary                         | Authenticate, validate, authorize, and return stable contracts.               |
| `src/features/connect/flow-manager-ui/` | Namespaced ported components, preview data, and feature status  | Mocks are permitted only behind Preview/Future guards.                        |
| `src/features/connect/shared/`          | Authoritative Connect application/domain services               | Reuse domain behavior across admin/client routes; no UI dependencies.         |
| `src/features/connect/bot-engine/`      | Deterministic client-side/reference bot behavior                | Must not replace the authoritative server runtime.                            |
| `supabase/connect/`                     | Ordered, additive database migrations and deployment notes      | Tenant keys, RLS, grants, idempotency, and rollback impact are mandatory.     |
| `tests/connect/`                        | Connect contract and regression suite                           | Add tests beside the boundary changed by each work package.                   |
| `tools/port-flow-manager-ui.mjs`        | Repeatable Lovable-to-main-app port                             | Connected route allowlists must prevent real adapters from being overwritten. |
| `docs/connect/`                         | Detailed architecture, provider, and operational specifications | Keep supporting details consistent with this roadmap.                         |

## System Architecture

```mermaid
flowchart LR
  Customer[WhatsApp customer] <--> Meta[Meta WhatsApp Cloud API]
  Meta -->|GET verify / signed POST events| Webhook[/api/connect/whatsapp/webhook]
  Webhook --> Verify[Signature parsing and phone-number routing]
  Verify -->|atomic ingest and claims| Inbox[(Supabase durable inbox)]
  Verify --> Runtime[Deterministic flow and commerce runtime]
  Runtime --> Sender[WhatsApp sender]
  Sender -->|Graph API| Meta
  Meta -->|sent delivered read failed| Webhook
  Admin[Admin browser] --> AdminApi[/api/connect/admin/*]
  Client[Client browser] --> ClientApi[/api/connect/client/* target]
  AdminApi --> AdminAuth[Internal admin session]
  ClientApi --> ClientAuth[Business session and role]
  AdminAuth --> Services[Shared Connect services]
  ClientAuth --> Services
  Services --> Inbox
  Services --> Domains[(Flows catalog orders diagnostics)]
```

Target architecture invariants. An invariant that is not yet satisfied remains
an active milestone requirement and must not be represented as Live:

1. `businessId` comes from a verified connection, internal-admin authorization,
   or the signed client session. A client request body never establishes tenant
   scope.
2. The browser never receives the Supabase service-role key, WhatsApp access
   token, app secret, verify token, or session-signing secret.
3. `wa_conversation_sessions` is deterministic runtime state;
   `wa_conversations` and related tables are the operator inbox. They may be
   linked, but neither silently replaces the other.
4. `wa_message_events` is a sanitized diagnostic stream;
   `wa_conversation_messages` and `wa_conversation_events` are the durable
   customer/operator timeline.
5. Every external side effect is idempotent, recorded before/with dispatch, and
   updated monotonically from provider callbacks.
6. Flow JSON orchestrates approved actions but never owns pricing, stock,
   totals, tenancy, order IDs, or order-state transitions.
7. The Lovable route tree owns presentation. Shared services and stable APIs own
   behavior so admin and client screens cannot implement conflicting rules.

## Connection Register

| Connection                 | Direction                                                                    | Authentication/configuration                                           | Current state                                                | Required gate                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Meta webhook               | Meta -> Vercel `GET/POST /api/connect/whatsapp/webhook`                      | Verify token for subscription; app-secret signature for events         | Working foundation; durable dual-write awaits deployed smoke | Reject invalid signatures, route known active number, persist once, process safely, return provider-compatible response. |
| Meta sender                | Vercel -> Graph `/PHONE_NUMBER_ID/messages`                                  | Server-only access token, phone number ID, Graph API version           | Text, buttons, lists, and images exist                       | Outbox attempt, idempotency key, sanitized failure, and timeline status required before human reply is Live.             |
| WhatsApp connection lookup | Server -> Supabase, then legacy env fallback                                 | `wa_whatsapp_connections.config_suffix` selects server env credentials | Database-first fallback is active                            | Every active number has a healthy DB record and completes a real roundtrip before fallback removal.                      |
| Supabase operations        | Vercel -> Supabase REST/RPC                                                  | `SUPABASE_URL`, server-only `SUPABASE_SERVICE_ROLE_KEY`                | Working                                                      | Every route authorizes first; RPC grants remain service-role-only; tenant tests pass.                                    |
| Admin browser              | Browser -> `/api/connect/admin/*`                                            | Internal-admin HMAC HttpOnly cookie                                    | Working foundation; Businesses partially connected           | Stable APIs, explicit business scope, audit events, loading/error states.                                                |
| Client browser             | Browser -> legacy `/api/connect/dashboard/*`; target `/api/connect/client/*` | Business-bound HMAC HttpOnly cookie                                    | Working but temporary                                        | New namespace, server-derived tenant, role contract, and compatibility redirects/adapters.                               |
| Lovable UI refresh         | `flow-manager/` -> namespaced main-app files                                 | Local port tool and connected-route allowlist                          | Working                                                      | Port test proves real route adapters and Future labels survive refresh.                                                  |
| Vercel environment         | Vercel -> application runtime                                                | Project environment variables                                          | Existing production contract reused                          | Preflight records key presence without printing values before every provider smoke.                                      |

## Environment And Secret Contract

Secret values never belong in this file, source control, browser bundles, logs,
screenshots, or test output. Only variable names and ownership are documented.

| Environment    | Purpose                                                                       | Current condition                                                                     | Exit requirement                                                                                                 |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Local          | Typecheck, tests, build, adapter development, optional controlled API testing | `.env.local` has server Supabase configuration; full Meta/auth parity is not recorded | Key-presence preflight passes for the boundary being tested; no production mutation without explicit intent.     |
| Vercel Preview | Release-candidate browser and API verification                                | Separate Supabase/Meta isolation is not yet documented                                | Before risky migrations, use isolated test data/provider credentials and the same runtime version as production. |
| Production     | Active businesses and real WhatsApp traffic                                   | Legacy Vercel contract and live Supabase project are authoritative                    | Migration, deploy, real roundtrip, health checks, evidence, and rollback decision all recorded.                  |

Required variable groups:

| Group                   | Variable names                                                                                                                                                                                                                                           | Rule                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Supabase server         | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`                                                                                                                                                                                                              | Service role is server-only. `VITE_SUPABASE_URL` may be a URL fallback, never an authorization mechanism.  |
| Supabase public/legacy  | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                                                                                                                                                                                                            | Public values may ship to the browser, but Connect operational tables remain behind server adapters.       |
| WhatsApp per connection | `WHATSAPP_ACCESS_TOKEN[_SUFFIX]`, `WHATSAPP_PHONE_NUMBER_ID[_SUFFIX]`, `WHATSAPP_BUSINESS_ACCOUNT_ID[_SUFFIX]`, `WHATSAPP_VERIFY_TOKEN[_SUFFIX]`, `WHATSAPP_APP_SECRET[_SUFFIX]`, `WHATSAPP_GRAPH_API_VERSION[_SUFFIX]`, `WHATSAPP_BUSINESS_ID[_SUFFIX]` | Suffix is selected by the database connection. `_2` is legacy data, not the limit of the model.            |
| Connection discovery    | `WHATSAPP_CONNECTION_SUFFIXES`                                                                                                                                                                                                                           | Temporary fallback inventory; database rows are the target registry.                                       |
| Client session          | `WA_DASHBOARD_USERNAME[_SUFFIX]`, `WA_DASHBOARD_PASSWORD[_SUFFIX]`, `WA_DASHBOARD_SESSION_SECRET[_SUFFIX]`, `WA_DASHBOARD_BUSINESS_ID[_SUFFIX]`                                                                                                          | Temporary business login. Each cookie is HttpOnly, SameSite=Lax, Secure in production, and business-bound. |
| Internal admin          | `WA_INTERNAL_ADMIN_USERNAME`, `WA_INTERNAL_ADMIN_PASSWORD`, `WA_INTERNAL_REVIEWER_USERNAME`, `WA_INTERNAL_REVIEWER_PASSWORD`, `WA_INTERNAL_ADMIN_SESSION_SECRET`                                                                                         | Internal boundary remains separate and auditable. No browser-selected business grants access.              |
| Supporting runtime      | `PUBLIC_SITE_URL`, `WA_BOT_LOGS_KEY`, `WA_PRODUCT_IMAGE_BUCKET`, owner-email provider variables                                                                                                                                                          | Validate only when the active work package uses them.                                                      |

Environment preflight records presence, selected suffix, endpoint host, and
provider/business identifiers safe for operations. It must never print secret
values. Production and preview values are managed in Vercel; local values stay
in ignored environment files.

## Data Ownership And Security

| Domain                    | Authoritative tables/services                                                                       | Roadmap ownership                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Businesses and membership | `wa_businesses`, `wa_business_users`                                                                | Milestone 4 identity, onboarding, and roles; used now for tenant checks. |
| WhatsApp connections      | `wa_whatsapp_connections` plus temporary env fallback                                               | Milestones 1 and 4 connection health and cutover.                        |
| Contacts                  | `wa_contacts`, `wa_tags`, `wa_contact_tags`                                                         | Milestone 1 inbox/contact operations; Milestone 6 consent/broadcast use. |
| Operator inbox            | `wa_conversations`, `wa_conversation_messages`, `wa_conversation_events`, `wa_canned_replies`       | Milestone 1 source of truth.                                             |
| Runtime state             | `wa_conversation_sessions`, processed-message records, canonical runtime services                   | Milestone 2 execution; linked to the inbox without replacing it.         |
| Flow definitions          | `wa_flow_templates`, template versions, business flows, immutable business versions                 | Milestone 2 builder and publishing.                                      |
| Catalog and checkout      | Categories, groups/routes, products, options, variants, settings, delivery, pickup, payment choices | Milestone 3 protected commerce.                                          |
| Orders                    | Orders, items, reservations, lifecycle history, notifications, atomic RPCs                          | Milestone 3; never controlled directly by UI or flow JSON.               |
| Diagnostics               | Webhook logs, sanitized message events, audit records                                               | Milestones 1, 4, and 7 operations.                                       |
| Media                     | `wa_media_assets` plus tenant-owned storage                                                         | Milestone 5; metadata exists, storage policy and processing do not.      |
| Broadcasts                | Not yet implemented                                                                                 | Milestone 6 new domain after consent, templates, and outbox.             |

Security model during Milestone 1:

- Internal admins may operate across businesses only after the dedicated admin
  session is verified; every selected business must still exist.
- Client sessions are scoped to the signed `businessId`. The current temporary
  session has no role claim, so it is treated as a trusted business operator for
  Milestone 1 only. No fine-grained role feature may be marked Live before
  Milestone 4.
- RLS remains enabled on operational tables with no browser-facing policies.
  The service role bypasses RLS, so route/service authorization and tenant tests
  are mandatory rather than optional defense.
- Phone numbers and provider payloads are restricted to operational storage.
  Logs use masked/hashed identifiers and sanitized provider errors.

## API Contract

New Flow Manager APIs use `/api/connect/admin/*` for internal operations and
`/api/connect/client/*` for business operations. Legacy dashboard APIs remain
compatibility endpoints until their callers are migrated.

Milestone 1 target resources:

| Capability                           | Admin endpoint family                                         | Client endpoint family                                         |
| ------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Conversation list/detail             | `GET /api/connect/admin/conversations[/:id]`                  | `GET /api/connect/client/conversations[/:id]`                  |
| Human reply                          | `POST /api/connect/admin/conversations/:id/replies`           | `POST /api/connect/client/conversations/:id/replies`           |
| Status, priority, assignment, unread | `PATCH /api/connect/admin/conversations/:id`                  | `PATCH /api/connect/client/conversations/:id`                  |
| Internal notes                       | `POST /api/connect/admin/conversations/:id/notes`             | `POST /api/connect/client/conversations/:id/notes`             |
| Tags                                 | `PUT/DELETE /api/connect/admin/conversations/:id/tags/:tagId` | `PUT/DELETE /api/connect/client/conversations/:id/tags/:tagId` |
| Contact list/detail                  | `GET /api/connect/admin/contacts[/:id]`                       | `GET /api/connect/client/contacts[/:id]`                       |

Contract rules:

1. Authenticate before parsing a tenant-controlled mutation; authorize the
   resource using server-derived tenant scope before reading or changing it.
2. List endpoints use opaque cursor pagination, deterministic ordering, a
   default page size of 25, and a hard maximum of 100.
3. Filters are validated server-side. Search, status, assignee, unread, and tag
   filters never become raw PostgREST or SQL fragments from the browser.
4. Responses use the existing `{ ok, data }` success envelope and a stable
   sanitized error code/message. Provider responses and stack traces are not
   exposed.
5. Timestamps are UTC ISO-8601. IDs are opaque. Phone display is permission-
   aware; logs remain masked.
6. External-send mutations require a client idempotency key. A retry returns
   the original operation rather than creating a second message.
7. Admin and client endpoints call shared domain services. They may shape
   different read models but cannot duplicate business rules.
8. Every endpoint has unauthorized, forbidden/not-found, invalid-input,
   success, retry/idempotency, and cross-tenant tests as applicable.

## Existing Business Migration And Cutover

The existing active business is production data, not disposable seed data.
Migration is additive and reversible at the application layer.

1. **Inventory and snapshot**: record active businesses, users, phone-number
   connections, published flow versions, open runtime sessions, customer
   profiles, and recent webhook/order counts without exporting secrets.
2. **Add schema**: deploy idempotent tables, indexes, functions, RLS, and grants
   in a transaction. Preserve all legacy tables and identifiers.
3. **Dual-write and compare**: continue the proven runtime while persisting the
   new inbox timeline. Compare provider IDs, business IDs, contact identity,
   counts, and errors before using the new store for operations.
4. **Promote reads**: connect admin/client list and detail APIs to the new store;
   legacy runtime and diagnostics remain authoritative for their domains.
5. **Promote mutations**: enable human reply and conversation operations only
   after the outbox, provider-window rules, audit, and retries pass.
6. **UI cutover**: remove Future status only after the exact Flow Manager route
   passes local, deployed, tenant, browser, and real-provider gates.
7. **Retire compatibility**: remove a legacy route/API/env fallback only after
   all active phone IDs have healthy database connections, each completes a
   real inbound/outbound/status roundtrip, and production records zero fallback
   resolutions for seven consecutive days.

Rollback contract:

- Database migrations in Milestones 1-6 are additive unless a separately
  approved migration plan says otherwise. Do not drop legacy data during UI
  promotion.
- Before a database deploy, capture affected-row counts and a scoped export or
  Supabase backup reference. Verify those counts afterward.
- If dual-write or the new UI fails, roll Vercel back to the last verified
  deployment. Leave additive tables in place, stop new workers/sends, and
  preserve records for diagnosis.
- A provider send cannot be undone. Recovery must use idempotency records and
  reconciliation, never blind replay.
- Add a server-side messaging/outbox kill switch before Milestone 1C is enabled
  for production users.

## Quality And Verification Strategy

### Definition of Ready

A work package may enter implementation only when:

- its user outcome, non-goals, dependencies, and completion evidence are named;
- authoritative tables/services and planned files are identified;
- request/response, tenant, role, idempotency, and failure behavior are clear;
- migration, backfill, rollout, and rollback impact are understood;
- automated, browser, database, and provider tests are listed; and
- unresolved product decisions that would invalidate the implementation are
  settled in the Decision Log.

### Verification Ladder

| Gate            | Required evidence                                                                                               | Typical command or check                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Static          | Type safety and touched-file lint pass                                                                          | `npm run typecheck`; scoped `npx eslint ...`                |
| Unit/contract   | Domain, parser, flow, route-source, and regression tests pass                                                   | `npm test`                                                  |
| Database        | Migration is transactional/idempotent; tables, functions, RLS, grants, constraints, and row counts are verified | SQL preflight and postflight recorded without secrets       |
| API integration | Auth, validation, pagination, idempotency, error mapping, and two-tenant isolation pass                         | Node tests against controlled fixtures/test data            |
| Build           | Production bundle completes using the main app                                                                  | `npm run build`                                             |
| Change hygiene  | No whitespace errors or accidental generated/mock regressions                                                   | `git diff --check`; focused diff review                     |
| Browser         | Exact Flow Manager route passes loading, empty, populated, error, permission, desktop, and 390px mobile states  | Local/preview browser run with console and overflow checks  |
| Provider        | Real test number completes inbound, outbound, status, duplicate/retry, and unknown-number scenarios as relevant | Meta/Vercel smoke with provider IDs and timestamps recorded |
| Operations      | Logs are sanitized and the new path has measurable health/failure signals                                       | Supabase/Vercel queries and alert checks                    |

Full-repository ESLint is a Milestone 7 gate. Until the untouched Lovable
preview surface is normalized, every changed Connect file must pass scoped
ESLint and no new lint debt may be introduced.

### Definition of Done

A work package is done only when:

- implementation, migration, authorization, persistence, failure states, and
  audit behavior are complete for its stated scope;
- all applicable verification-ladder gates pass and are recorded;
- real provider/database checks prove the intended production behavior;
- the relevant Flow Manager route status is accurate and mocks are absent from
  any promoted path;
- deployment and rollback procedures are tested or explicitly exercised;
- supporting docs and this roadmap reflect the resulting architecture; and
- the Roadmap Changelog includes commit/deployment, schema, tests, manual smoke,
  residual risks, and the next active work package.

Passing code tests alone does not promote a work package. Failing any required
gate keeps it In progress and blocks the next milestone.

## Deployment And Release Runbook

1. **Prepare**: confirm active work package, review diff, run static/tests/build,
   inspect migration dependencies, and record production baseline counts.
2. **Database first**: apply additive SQL in documented order, inside a
   transaction where supported; run postflight RLS/grant/function/data checks.
3. **Application second**: deploy the exact tested commit to Vercel with a
   preflight that confirms required environment-key presence without values.
4. **Technical smoke**: verify health, auth boundaries, affected APIs, no server
   errors, and no unexpected fallback/duplicate activity.
5. **Browser smoke**: verify affected admin/client routes at desktop and mobile,
   including loading, failure, permission, and refresh persistence.
6. **Provider smoke**: use a designated real test contact/number; capture Meta
   message IDs, connection/business IDs, timestamps, and final statuses.
7. **Accept or roll back**: compare completion evidence with the active gate.
   Roll back the Vercel deployment if behavior is unsafe; never mark partial
   evidence complete.
8. **Record**: append the result, residual risk, and next authorized work package
   to the Roadmap Changelog before further product implementation.

Required release evidence format:

```text
Date / milestone / work package:
Commit and Vercel deployment:
Database migration and postflight:
Automated checks:
Browser checks:
Real Meta scenario and provider IDs:
Observed failures or residual risk:
Rollback result or rollback readiness:
Decision: accepted, rolled back, or still in progress
Next authorized work package:
```

## Observability Contract

| Signal             | Required fields                                                                                              | Milestone 1 action                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Webhook receipt    | request/correlation ID, event type, safe phone-number ID, connection/business ID, signature result, duration | Preserve sanitized logs and expose unknown-number/signature/persistence failures. |
| Inbound processing | provider message ID, duplicate/claim result, conversation ID, flow/session link, outcome, duration           | Complete linkage and processing-failure visibility in 1A.                         |
| Outbox attempt     | operation/idempotency ID, message ID, business/connection, attempt number, provider result, retry time       | Implement in 1C before human reply promotion.                                     |
| Delivery callback  | provider message ID, previous/new status, callback timestamp, ignored regression reason                      | Complete outbound timeline insertion and monotonic updates.                       |
| Authorization      | actor/session type, safe resource ID, action, allow/deny, business ID                                        | Add route-level audit without logging secrets or raw customer content.            |
| UI/API health      | route, status/error code, correlation ID, latency                                                            | Provide actionable error state and server log correlation.                        |

Milestone 1 acceptance targets are zero cross-tenant reads/mutations, zero
duplicate durable messages for the same provider ID, and one auditable outbox
record for every attempted human send. Latency and availability are measured
during Milestone 1; numeric production SLOs and alerts are ratified in
Milestone 7 from observed traffic rather than invented now.

## Risk Register

| ID  | Risk                                                              | Impact   | Mitigation and owning gate                                                                                        |
| --- | ----------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| R1  | New inbox work regresses the active legacy business               | Critical | Additive schema, dual-write comparison, real roundtrip, Vercel rollback; Milestone 1.                             |
| R2  | Service-role access bypasses RLS and leaks tenants                | Critical | Server-derived tenant, shared authorization, two-tenant denial tests on every API; all milestones.                |
| R3  | Meta sends duplicate or out-of-order webhooks                     | High     | Provider-ID uniqueness, atomic processing claims, monotonic statuses, reconciliation; Milestone 1.                |
| R4  | Database connection metadata and Vercel suffix credentials drift  | High     | Connection health/preflight, explicit suffix inventory, fallback telemetry, measured cutover; Milestones 1 and 4. |
| R5  | Human replies violate the WhatsApp customer-service window        | High     | Track last customer message, block free text outside window, require approved template; Milestone 1C.             |
| R6  | Serverless failure creates duplicate or lost outbound sends       | Critical | Durable outbox, claim lease, attempt history, idempotency, kill switch, reconciliation; Milestone 1C.             |
| R7  | Lovable refresh overwrites connected adapters                     | High     | Connected-route allowlist, port regression tests, focused diff review; every UI promotion.                        |
| R8  | Inbox timeline and deterministic runtime disagree                 | High     | Explicit flow/session linkage, immutable version IDs, shared events, diagnostic comparison; Milestones 1A and 2.  |
| R9  | Temporary environment-backed auth is mistaken for final RBAC      | High     | Keep role/team screens Future; business-bound sessions now, database identities in Milestone 4.                   |
| R10 | Production-only database/provider environment makes changes risky | High     | Transactions, snapshots, test contacts, preview isolation before destructive work; immediate platform debt.       |
| R11 | Unpinned runtime or split Lovable dependencies cause deploy drift | Medium   | Pin Node, main lockfile is authoritative, build exact deploy commit; Milestone 1 platform task.                   |
| R12 | Preview data is accidentally presented as live                    | High     | Central feature registry, persistent Future notice, mutation guard, mock-import regression tests.                 |

## Milestone Roadmap

### Execution Contract

This roadmap is ordered. Only one milestone may be active at a time.

1. We do not promote isolated pages merely because a read API can populate
   them. A milestone must deliver a complete user journey across database,
   server behavior, permissions, UI, tests, and deployment verification.
2. Work outside the active milestone is limited to regressions or a blocker for
   that milestone. All other screens stay visible and labeled `Future`.
3. Client APIs derive `businessId` and permissions from the authenticated
   server session. The browser never chooses its own tenant.
4. Existing deterministic flow, catalog, checkout, order, sender, and webhook
   services remain the backend foundation. New Flow Manager routes adapt those
   services instead of creating parallel behavior.
5. A route loses its `Future` status only when its reads, mutations,
   authorization, failure states, tests, and deployed behavior are complete.
6. Every completed milestone updates this file with evidence and the next
   active milestone before unrelated implementation begins.

Definition of done for every milestone:

- Required schema is versioned, deployed, backfilled, and tenant-scoped.
- Server reads and mutations enforce authorization independently of the UI.
- The exact Flow Manager screens use real data and honest failure/empty states.
- Idempotency, retries, audit history, and provider errors are handled where the
  workflow can create external side effects.
- Automated tests, production build, desktop/mobile browser verification, and a
  deployed-environment smoke test pass.

### Milestone Control Board

| Order | Milestone                              | Status            | Depends on                          | Promotion evidence                                                        |
| ----- | -------------------------------------- | ----------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| 0     | Integrated Foundation                  | Complete baseline | None                                | Exact UI mounted, core schema live, first adapters verified.              |
| 1     | WhatsApp Operations                    | **Active**        | Milestone 0                         | Real inbound-to-inbox-to-human-reply-to-status journey and tenant denial. |
| 2     | Visual Flow Builder and Runtime        | Queued            | Milestone 1 timeline and operations | Published Flow Manager canvas executes a real pinned flow with trace.     |
| 3     | Commerce and Order Operations          | Queued            | Milestone 2 protected runtime       | Real catalog-to-idempotent-order-to-owner lifecycle in new UI.            |
| 4     | Workspace, Onboarding, and Permissions | Queued            | Stable domain/API boundaries        | New business connects WhatsApp, invites roles, and passes tenancy checks. |
| 5     | Media and Voice Notes                  | Queued            | Messaging outbox and flow runtime   | Prerecorded outbound audio and inbound transcription complete real flows. |
| 6     | Templates and Broadcasts               | Queued            | Contacts consent, templates, outbox | Audited compliant template broadcast to consented recipients.             |
| 7     | Production Hardening and Launch        | Queued            | Milestones 1-6                      | Security, load, observability, recovery, accessibility, and Meta QA.      |

Queue rules:

- A queued milestone may be researched only when it unblocks the active one.
- A work package cannot move to Complete with an unverified production item.
- The next milestone becomes Active only after the current completion gate is
  accepted and recorded in the Roadmap Changelog.

### Milestone 0 - Integrated Foundation

Status: **Complete baseline**

- [x] Preserve the existing WhatsApp webhook, deterministic runtime, sender,
      catalog, checkout, order, diagnostics, and authentication foundations.
- [x] Mount the exact Lovable admin and client UI under `/connect` without
      embedding the legacy presentation.
- [x] Keep incomplete destinations clickable, mutation-free, and labeled
      `Future`.
- [x] Deploy the tenant-scoped contacts, tags, media, conversation, message,
      event, canned-reply, and user-metadata schema.
- [x] Preserve the existing active business and WhatsApp connection during the
      migration.
- [x] Connect the admin Businesses list, status filtering, row navigation, and
      setup checklist to authenticated live data.
- [x] Connect the client Automations list to the authorized business's canonical
      flow summary.
- [x] Keep the production build, typecheck, and 40-test Connect baseline green.

Completion evidence: the Lovable UI is the only visible Connect product, the
core schema is live, existing business data is preserved, and the first real
admin/client read adapters are verified.

### Milestone 1 - WhatsApp Operations

Status: **Active - all unrelated feature work is paused**

Product outcome: a real WhatsApp customer message creates or updates the
contact and conversation, appears in both authorized inboxes, can be handled by
a human, receives a real text reply, and records provider delivery state.

Milestone 1 work-package contract:

| Work package             | Deliverables                                                                                                       | Primary artifacts                                                                            | Required exit evidence                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1A Durable inbound       | Atomic ingest/claim, contact/conversation timeline, flow/session linkage, monotonic status hook                    | `wa_messaging_operations_rpc.sql`, messaging store, webhook handler, parser/tests            | Vercel deploy; real inbound appears once; retry remains once; bot still responds; status callback is accepted and diagnostically recorded. |
| 1B Authorized APIs       | Shared query service, admin/client list/detail/contact projections, cursor filters                                 | New shared inbox query service and admin/client API routes                                   | Contract/API tests including two businesses, pagination, filters, denied cross-tenant IDs, sanitized errors.                               |
| 1C Human operations      | Durable outbox, text reply, service-window enforcement, lifecycle, assignment, notes, tags, unread, canned replies | Additive outbox SQL, shared command service, sender integration, API mutations               | Retry-safe real reply, attempt/status history, blocked out-of-window free text, reload persistence, audit and kill-switch verification.    |
| 1D Flow Manager surfaces | Exact admin Live Operations, client Inbox, and Contacts use real APIs                                              | Connected Lovable routes, query/mutation adapters, feature registry, port preservation rules | No promoted-route mock imports; desktop/mobile states; real admin/client journey; provider/API failures visible.                           |

Current authorized next action: deploy and smoke-test 1A. Work on 1B begins
only after the real inbound/retry/status-hook evidence is recorded or a
discovered 1A defect is fixed and re-verified. Outbound timeline insertion and
end-to-end delivery state remain in 1C and the Milestone 1 completion gate.

Milestone 1 platform controls:

- [ ] Pin the Node runtime and verify Vercel uses the same major version before
      1B is released.
- [ ] Add a secret-safe environment preflight for the active Supabase,
      WhatsApp, admin, and client configuration groups.
- [ ] Introduce `CONNECT_HUMAN_SEND_ENABLED` as a server-side, default-off kill
      switch before 1C human sends are deployed.
- [ ] Record fallback connection resolutions so legacy Vercel credential use
      can be measured before retirement.

#### 1A - Durable inbound data plane

- [~] Create one tenant-safe messaging store for contacts, conversations,
  messages, events, notes, tags, and unread counters. Contacts,
  conversations, messages, events, and unread counters are connected;
  notes and tags remain in 1C.
- [~] Dual-write verified inbound WhatsApp messages from the existing webhook
  into the messaging store before running the deterministic flow. Code and
  live database RPCs are ready; Vercel deployment and a real webhook smoke
  test remain.
- [x] Make inbound persistence idempotent by provider message ID and safe under
      webhook retries or concurrent delivery.
- [x] Upsert contacts without exposing full phone numbers in logs or cross-tenant
      queries.
- [ ] Record flow/session linkage and handoff state on the conversation timeline.
- [~] Update outbound message state from sent, delivered, read, and failed Meta
  status webhooks. The monotonic status RPC and webhook hook are ready;
  outbound timeline insertion remains in 1C.

#### 1B - Authorized inbox APIs

- [ ] Add paginated admin conversation list/detail APIs across authorized
      businesses.
- [ ] Add paginated client conversation list/detail APIs scoped only to the
      signed-in business.
- [ ] Add server-side search, status, assignment, unread, and tag filters.
- [ ] Add contact history and timeline projections without duplicating domain
      records in UI-specific tables.
- [ ] Cover every read and mutation with tenant-isolation and role tests.

#### 1C - Human operations and outbound reply

- [ ] Add an idempotent outbound outbox with attempt history, retry policy, and
      visible permanent failures.
- [ ] Send a human text reply through the existing WhatsApp sender and append it
      to the same conversation timeline.
- [ ] Enforce the WhatsApp customer-service window and require an approved
      template when free-form replies are not allowed.
- [ ] Implement open, pending, snoozed, reopened, and closed lifecycle behavior.
- [ ] Implement assignment/transfer, internal notes, tags, unread state, and
      canned replies with audit events.
- [ ] Keep image, document, template, and prerecorded-audio replies visible as
      `Future` until their media/template dependencies are completed.

#### 1D - Complete Flow Manager surfaces

- [ ] Connect admin Live Operations list and conversation detail to the real
      admin APIs.
- [ ] Connect client Inbox list and conversation detail to the real client APIs.
- [ ] Connect admin and client Contacts pages to the same contact domain.
- [ ] Remove every mock conversation/contact import from those promoted routes.
- [ ] Add loading, empty, retry, permission, provider-failure, and disconnected
      WhatsApp states without changing the Lovable composition.

Milestone 1 completion gate: using a real test WhatsApp number, one inbound
message appears exactly once in the correct tenant's admin and client inboxes;
an authorized human replies; sent/delivered/read or failed status appears in the
timeline; assignment, note, tag, and close/reopen actions survive reload; another
tenant cannot read or mutate the conversation.

Current implementation sequence: **1A messaging store and webhook dual-write,
then 1B APIs, 1C mutations, and 1D UI. Do not integrate another page family
until this gate passes.**

### Milestone 2 - Visual Flow Builder and Runtime

Status: **Queued after Milestone 1**

- [ ] Map the exact Lovable canvas to the existing canonical v2 flow document.
- [ ] Load, edit, validate, save drafts, publish immutable versions, and inspect
      version history through authorized APIs.
- [ ] Support WhatsApp trigger, text, image, template, question, menu, branch,
      contact field, tag, assignment, handoff, wait, jump, subflow, and close
      nodes.
- [ ] Persist typed answers and deterministic branch decisions.
- [ ] Write per-contact execution progress and errors into the conversation
      timeline built in Milestone 1.
- [ ] Add test simulation, unsaved-change protection, execution traces, and
      stop/restart controls.

Completion gate: an authorized user builds and publishes a flow entirely in the
new canvas; a real inbound WhatsApp conversation executes that published
version; each step and failure is visible in the inbox timeline and diagnostics.

### Milestone 3 - Commerce and Order Operations

Status: **Queued after Milestone 2**

- [ ] Connect catalog routes, route values, products, variants, stock, checkout,
      fulfillment, and settings to the existing protected backend services.
- [ ] Expose only the constrained order configuration defined in Backend Order
      Policy; price, inventory, idempotency, and transitions remain protected.
- [ ] Connect client order list/detail, owner decisions, reminders, fulfillment,
      cancellation, and audit history.
- [ ] Show cart, checkout, order creation, owner decision, and fulfillment events
      in the Milestone 1 conversation timeline.
- [ ] Preserve compatibility for existing businesses and active sessions.

Completion gate: a published WhatsApp flow creates a valid idempotent order from
real catalog data, the owner/client handles it in the new UI, and the customer
receives audited status updates without bypassing protected rules.

### Milestone 4 - Workspace, Onboarding, and Permissions

Status: **Queued**

- [ ] Replace environment-only client users with database-backed identities,
      secure sessions, expiry, and rotation while preserving server-derived
      tenant scope.
- [ ] Implement owner, manager, agent/staff, and viewer permissions plus
      invitations, activation, removal, and audit events.
- [ ] Complete business creation, setup checklist mutations, WhatsApp connection
      configuration/health, workspace switching, and team management.
- [ ] Connect admin Overview, Settings, Logs, Diagnostics, and operational
      analytics to real data.
- [ ] Keep separate, auditable Double A internal-admin authorization.

Completion gate: a new business can be onboarded from the new admin UI, connect
WhatsApp, invite its team, pass setup checks, and enter the client workspace with
every read and mutation enforcing its role and tenant.

### Milestone 5 - Media and Voice Notes

Status: **Queued**

- [ ] Complete tenant-owned image, document, and prerecorded-audio storage,
      validation, retention, and secure access.
- [ ] Add media messages and prerecorded-audio flow/reply support with delivery
      history.
- [ ] Securely download inbound WhatsApp audio and run transcription jobs with
      retries, usage records, and explicit low-quality fallback.
- [ ] Feed usable transcript text into the active deterministic flow and show the
      original audio plus transcript in the inbox.

Completion gate: a client can reuse prerecorded audio in a real flow, and a real
customer voice note is stored, transcribed, displayed, and safely continues the
same deterministic conversation.

### Milestone 6 - Templates and Broadcasts

Status: **Queued**

- [ ] Complete authorized WhatsApp template listing/submission, Meta status,
      language, category, quality, and rejection tracking.
- [ ] Add contact consent evidence, segments, recipient snapshots, and compliant
      audience validation.
- [ ] Add broadcast draft, schedule, cancel, rate-aware send, retry, completion,
      per-recipient outcomes, and delivery/read/reply reporting.
- [ ] Prevent sends without an approved template and valid consent.

Completion gate: an authorized client sends and audits a compliant WhatsApp
template broadcast to a consented audience without bypassing rate, tenant, or
template rules.

### Milestone 7 - Production Hardening and Launch

Status: **Queued**

- [ ] Add complete role/tenant, workflow migration, outbox, scheduler,
      transcription, broadcast, and load-test coverage.
- [ ] Add structured observability, alerts, operator runbooks, backups, restore,
      retention, deletion, and incident procedures.
- [ ] Add abuse controls, rate limits, secret rotation, accessibility, and
      security review.
- [ ] Complete Meta review evidence and end-to-end QA with real WhatsApp test
      accounts.

Completion gate: production behavior is secure, observable, recoverable, and
verified under realistic WhatsApp traffic and failure scenarios.

## Future Work

These remain visible as clickable Preview screens until explicitly promoted to
the active roadmap:

- Autonomous AI agent and knowledge sources.
- AI reply assistance for human operators.
- AI-generated voice.
- Voice calls and call-center operations.
- Instagram, Messenger, email, SMS, and webchat.
- Payment requests and payment-provider integrations.
- General third-party integration marketplace.
- Public developer API, tenant API keys, and outgoing webhooks.
- Advanced billing, subscriptions, and usage metering.
- SSO, SCIM, data residency controls, and enterprise compliance programs.

## Decision Log

| Date       | Decision                                                                            | Reason                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-16 | Flow Manager is the target UI, not a second deployed app.                           | The main app already owns working routes, APIs, auth, Supabase, and deployment.                                                                      |
| 2026-07-16 | Current product scope is WhatsApp only.                                             | Focus engineering on a complete messaging and workflow product.                                                                                      |
| 2026-07-16 | AI agents are deferred.                                                             | Deterministic flow reliability and operations come first.                                                                                            |
| 2026-07-16 | Audio means prerecorded outbound responses plus inbound transcription.              | No generated voice or AI phone calls are required.                                                                                                   |
| 2026-07-16 | Future features stay clickable as labeled previews.                                 | Keep the product vision visible without claiming fake functionality.                                                                                 |
| 2026-07-16 | Order behavior uses protected backend actions with constrained admin configuration. | Preserve price, inventory, idempotency, and order-state integrity.                                                                                   |
| 2026-07-16 | Target workflow quality is respond.io-grade for WhatsApp, not omnichannel parity.   | Build strong triggers, steps, branches, operations, testing, and execution history around WhatsApp.                                                  |
| 2026-07-16 | New Connect routes reuse the legacy server-side Vercel environment contract.        | Preserve deployed dashboard, Supabase, and WhatsApp configuration without exposing secrets to the browser or creating a second configuration system. |
| 2026-07-16 | Flow Manager owns the new UI; legacy route components cannot be embedded in it.     | Reuse proven backend behavior without creating a visually inconsistent hybrid product.                                                               |
| 2026-07-16 | The checked-out Flow Manager route/component tree is the canonical UI baseline.     | Backend adapters must make the supplied product functional without substituting a custom shell or redesigned page composition.                       |
| 2026-07-17 | `https://doubleacode.com` is the canonical production origin.                       | Production acceptance must test the real deployed product consistently; a hosting redirect to `www` is an alias, not a different environment.        |

## Roadmap Changelog

Earlier entries preserve the migration history. The latest entry and the
current-status sections above define the active implementation state.

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Verification                                                                                                                                                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-16 | Created the living roadmap from the existing implementation audit and product-scope decisions.                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Existing Connect suite: 37 tests passed. Current typecheck blocked by missing local `@xyflow/react` installation.                                                                                                                                                                                                                        |
| 2026-07-16 | Synchronized dependencies; added the shared Connect feature registry, status treatments, admin/client shells, authenticated client home, legacy tool bridges, and clickable Future Work previews; repaired `/connect` route nesting so child workspaces render.                                                                                                                                                                                                                                                                                             | Production build passed; typecheck passed; 37 tests passed; `/connect`, `/connect/client`, and `/connect/admin` verified in desktop and 390px mobile browser layouts with no current console errors.                                                                                                                                     |
| 2026-07-16 | Connected client Automations to business-scoped canonical flow APIs using the existing `WA_DASHBOARD_*`, Supabase, and WhatsApp Vercel contracts; added real template cloning, visual editing, image upload, draft save, checkout-setting save, validation, version display, and publishing. Expanded `.env.example` with the legacy primary, partner, and internal-admin variable names.                                                                                                                                                                   | Production build passed; typecheck passed; 38 tests passed; scoped ESLint passed, including a tenant-authorization regression test.                                                                                                                                                                                                      |
| 2026-07-16 | Corrected the UI migration boundary: removed the embedded legacy admin editor from the client route, restored legacy admin media handling to its own route, ported the Flow Manager light workspace theme and navigation, and added a Flow Manager-native canonical editor with real data and mutations.                                                                                                                                                                                                                                                    | Production build, typecheck, and scoped ESLint passed; 39 tests passed, including a regression test forbidding legacy editor and mock-data imports in the client Flow Manager; login verified at desktop and 390px mobile with no overflow or browser errors.                                                                            |
| 2026-07-16 | Reset the Connect presentation to the exact checked-out Flow Manager UI: registered the source as the `flow-manager/` submodule, ported its admin/client routes and components under `/connect`, removed the custom shell/editor approximation, replaced old dashboard child pages with redirect-only compatibility shims, preserved existing auth and backend foundations, disabled mock success toasts, and added persistent Preview/Future Work mutation guards.                                                                                         | Production build, typecheck, and scoped ESLint passed; 39 tests passed; client login boundary, exact Home, Automations list/canvas, mutation blocking, Future Work labeling, and 390px responsive containment verified in browser.                                                                                                       |
| 2026-07-16 | Mapped every exact Lovable admin/client route to an existing backend, additive schema, derived read model, new domain, or Future Work status. Added the idempotent `wa_flow_manager_core_schema.sql` migration for tenant-scoped contacts, tags, inbox conversations/messages/events, canned replies, user metadata, and reusable media, including checkout-customer backfill and service-role-only RLS access.                                                                                                                                             | Static schema contract test added; 40 tests pass. Migration deployment and live Supabase verification remain pending.                                                                                                                                                                                                                    |
| 2026-07-16 | Promoted the exact Lovable client Automations route to its first real adapter: authenticated workspaces now load the authorized business's canonical flow/version summary through the existing Vercel-backed dashboard API, while the supplied canvas and mutations remain visibly preview-only. Updated the mechanical port tool to preserve promoted connected routes during future Lovable refreshes.                                                                                                                                                    | Port refresh preserved the connected route byte-for-byte; production build, typecheck, scoped ESLint, and all 40 Connect tests passed.                                                                                                                                                                                                   |
| 2026-07-16 | Added a central Flow Manager feature-status registry and visible `Future` markers to every incomplete admin/client navigation destination, page, and internal tab. The connected Automations list tab is exempt while its unfinished Canvas remains marked. The port tool now reapplies sidebar badges after every canonical Lovable refresh.                                                                                                                                                                                                               | Port refresh retained the status treatment; typecheck, scoped ESLint, and all 40 Connect tests passed. Desktop/mobile browser and production-build verification recorded with this change.                                                                                                                                               |
| 2026-07-17 | Deployed `wa_flow_manager_core_schema.sql` to the live Supabase project after prerequisite checks and a scoped snapshot of the existing business-user and customer-profile tables. The migration added the Flow Manager contact, tag, media, inbox conversation/message/event, canned-reply, and workspace metadata foundations without replacing the existing WhatsApp business data.                                                                                                                                                                      | Transaction completed successfully. All eight new tables are REST-accessible, RLS-enabled, and granted to `service_role`; two customer profiles were backfilled to two contacts; the existing active business and active WhatsApp connection remained active.                                                                            |
| 2026-07-17 | Promoted the exact Flow Manager admin Businesses route group to a real adapter. The list now loads authenticated Supabase business, owner, WhatsApp connection, health, and setup data; search and status filters are functional; real business IDs open a live setup checklist. Connected route files are preserved during future Lovable refreshes while creation and deeper configuration actions remain labeled Future.                                                                                                                                 | Production build, typecheck, scoped ESLint, and all 40 Connect tests passed. An ephemeral local admin session verified the two live Supabase business records, filtering, row navigation, the real 10/11 setup checklist, zero console errors, and no page overflow at 1440px or 390px.                                                  |
| 2026-07-17 | Replaced the feature-area phase list with an ordered milestone roadmap and execution contract. Milestone 1 is now the only active product scope: complete WhatsApp Operations from webhook persistence through tenant-safe inbox APIs, human reply/outbox, delivery state, lifecycle, assignment, notes, tags, contacts, and both exact Flow Manager inboxes. Unrelated page-family integration is paused until the end-to-end gate passes.                                                                                                                 | Roadmap now defines one active milestone, dependency order, explicit non-goals, required database/server/UI/security/test/deployment work, and an observable completion gate for every milestone.                                                                                                                                        |
| 2026-07-17 | Implemented Milestone 1A's durable inbound foundation. The existing verified WhatsApp webhook now persists tenant-scoped contacts, conversations, inbound messages, creation events, unread state, and retry-safe processing claims before deterministic flow execution. Meta delivery webhooks now target a monotonic timeline-status RPC. The additive processing table and three service-role-only RPCs were deployed to the live Supabase project.                                                                                                      | Live SQL verification confirmed the processing table, all three RPCs, service-role execution, and denial for authenticated users. Typecheck, scoped ESLint, all 42 Connect tests, the production build, and `git diff --check` passed. Vercel deployment and a real Meta webhook smoke test remain before dual-write is marked complete. |
| 2026-07-17 | Expanded the roadmap from a product milestone outline into the Connect delivery control document. Added document ownership, audited baseline and stack, repository and architecture boundaries, connection/environment/secret registers, data ownership, API conventions, active-business cutover and rollback, Definition of Ready/Done, verification and release runbooks, observability, risk ownership, milestone controls, and exact Milestone 1 work-package evidence. Tightened workspace instructions so queued work cannot bypass the active gate. | Cross-checked against the main and Lovable package manifests, Vercel/Vite configuration, environment-key inventory, server auth and connection resolution, Flow Manager port/status registry, deployed schema/RPC sources, API route families, backend map, and current tests. Documentation-only change; runtime behavior is unchanged. |
| 2026-07-17 | Recorded `https://doubleacode.com` as the canonical production origin and populated the public-site example configuration.                                                                                                                                                                                                                                                                                                                                                                                                                                  | Future deployment, browser, API, and webhook acceptance evidence must start from the canonical origin and may record Vercel's redirect to `www` as hosting behavior.                                                                                                                                                                     |
