# Double A Connect Product Roadmap

Last updated: 2026-07-18

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
| Vercel project           | `saeed-ahmar-s-projects/double-a-code-portfolio` (`prj_AkfM1Wn7HSwHhXz2DMODfsEWQOi5`) owns the production aliases.                                             |
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
- [x] Automated Connect suite: 80 tests passing on 2026-07-18.

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
  events, assignment/transfer, priority, lifecycle, unread state, internal notes,
  contact tags, canned replies, and audited collaboration commands. The exact
  Flow Manager inbox surfaces remain pending in 1D.
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

| Area                 | Current baseline                                                                                                                                                                                                                                                                             | Target                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Product surface      | Exact Lovable admin/client route trees mounted below `/connect`; most routes are Preview/Future.                                                                                                                                                                                             | One coherent Flow Manager product with real, tenant-safe operations.                         |
| Connected UI         | Admin Businesses, setup, WhatsApp Connection, and Live Test use real adapters; client Automations only loads the real flow summary. Its Guided and Canvas editors are separate hard-coded Lovable previews and do not edit the real flow. Business Diagnostics remains Lovable preview data. | Each route graduates independently only after its full journey passes.                       |
| WhatsApp             | Verified webhook, phone-number routing, deterministic processing, sender, diagnostics, and new durable inbound persistence code.                                                                                                                                                             | Durable inbox, human operations, statuses, flows, media, templates, and broadcasts.          |
| Database             | Existing `wa_*` commerce/runtime domains plus deployed additive Flow Manager inbox/contact tables and messaging RPCs.                                                                                                                                                                        | Versioned, tenant-scoped domains with migration and rollback evidence.                       |
| Authentication       | HMAC-signed, environment-backed internal-admin and client cookies. Client sessions are tied to one configured business.                                                                                                                                                                      | Database-backed users, workspace memberships, role enforcement, rotation, and audit.         |
| Deployment           | Automatic `main` deployment is working. The Milestone 1A release first verified at commit `5f059bf` reached Ready and was promoted to both canonical aliases.                                                                                                                                | Repeatable local, preview, and production release ladder with smoke and rollback procedures. |
| Legacy compatibility | Database connection lookup falls back to legacy suffixed Vercel WhatsApp variables. Existing APIs and services remain available behind redirects/adapters.                                                                                                                                   | Database-owned connections and new UI, with fallback removed only after measured cutover.    |
| Verified baseline    | Typecheck, scoped ESLint, 42 main tests, 14 reliability tests, production build, live SQL checks, and desktop/mobile production checks pass.                                                                                                                                                 | Every milestone adds automated, browser, database, and real-provider evidence.               |

Known release gap: the Milestone 1A application code and live RPCs are deployed,
but the real Meta inbound/retry/status smoke test is not complete. Production
contains the Milestone 1A runtime on both canonical aliases, first verified at
commit `5f059bf`. Secret-safe production login, session, and Businesses API
checks return `200`; the exact Businesses UI renders two live Supabase records
without browser errors or overflow. The active business is Live, 100% configured,
WhatsApp Active, Health OK, and 10/11 on the real setup checklist. Its remaining
item is a real test message. WhatsApp Connection reads the database, and its
admin-authorized runtime-secret check passes against Meta with HTTP `200`, a
matched phone identity, and `GREEN` quality. Live Test now uses the real
connection, authorized approved-template/text sender, and provider event log as
the 1A verification harness. Diagnostics remains a static Lovable example and
is excluded from live acceptance evidence until connected.

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

| Order | Milestone                              | Status            | Depends on                          | Promotion evidence                                                                      |
| ----- | -------------------------------------- | ----------------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| 0     | Integrated Foundation                  | Complete baseline | None                                | Exact UI mounted, core schema live, first adapters verified.                            |
| 1     | WhatsApp Operations                    | Complete          | Milestone 0                         | Real inbound-to-inbox-to-human-reply-to-status journey and tenant denial.               |
| 2     | Guided Flow Builder and Runtime        | **Active**        | Milestone 1 timeline and operations | A flow built and repaired entirely in Guided executes a real pinned version with trace. |
| 3     | Commerce and Order Operations          | Queued            | Milestone 2 protected runtime       | Real catalog-to-idempotent-order-to-owner lifecycle in new UI.                          |
| 4     | Workspace, Onboarding, and Permissions | Queued            | Stable domain/API boundaries        | New business connects WhatsApp, invites roles, and passes tenancy checks.               |
| 5     | Media and Voice Notes                  | Queued            | Messaging outbox and flow runtime   | Prerecorded outbound audio and inbound transcription complete real flows.               |
| 6     | Templates and Broadcasts               | Queued            | Contacts consent, templates, outbox | Audited compliant template broadcast to consented recipients.                           |
| 7     | Production Hardening and Launch        | Queued            | Milestones 1-6                      | Security, load, observability, recovery, accessibility, and Meta QA.                    |

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

Status: **Complete - production release `m1d-contacts-v1` accepted**

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

Current authorized next action: begin only Milestone 2B safe draft editing.
Implement recoverable Guided step mutations, destinations, validation/problem
navigation, undo/redo, dirty-state protection, conflict handling, and retryable
saves through the existing authorized APIs. Publishing remains deferred to 2C,
Canvas remains `Future`, and provider sending remains off.

Milestone 1 platform controls:

- [x] Pin the Node runtime and verify Vercel uses the same major version before
      1B is released. `package.json` requires Node `22.x`; Vercel project
      settings and deployment `dpl_HE8FEZGtSHFXNzC9K7hcH7o4XYMi` both report
      Node `22.x`.
- [~] Add a secret-safe environment preflight for the active Supabase,
  WhatsApp, admin, and client configuration groups. WhatsApp now has a
  runtime health endpoint and a CLI preflight that rejects masked values;
  the other groups remain.
- [x] Introduce `CONNECT_HUMAN_SEND_ENABLED` as a server-side, default-off kill
      switch before 1C human sends are deployed. A service-role-only Supabase
      flag now provides the no-Vercel rollout control and also defaults off.
- [ ] Record fallback connection resolutions so legacy Vercel credential use
      can be measured before retirement.

#### 1A - Durable inbound data plane (Complete)

- [~] Create one tenant-safe messaging store for contacts, conversations,
  messages, events, notes, tags, and unread counters. Contacts,
  conversations, messages, events, and unread counters are connected;
  notes and tags remain in 1C.
- [x] Dual-write verified inbound WhatsApp messages from the existing webhook
      into the messaging store before running the deterministic flow. Marker A3
      proved signed HTTP `200` delivery, one durable row, one processed claim, one
      bot response, monotonic status callbacks, and duplicate rejection.
- [x] Make inbound persistence idempotent by provider message ID and safe under
      webhook retries or concurrent delivery.
- [x] Upsert contacts without exposing full phone numbers in logs or cross-tenant
      queries.
- [x] Record flow/session linkage and handoff state on the conversation
      timeline. A4 proved exact conversation/session flow, version, and node
      linkage with one `FLOW_STARTED`; a rollback-only double-call postflight proved
      one idempotent human-handoff `FLOW_STOPPED` event.
- [x] Update outbound message state from sent, delivered, read, and failed Meta
      status webhooks. Human marker `LIVE-1C-HUMAN-0718` produced one durable
      outbound row that advanced through `SENT` to `DELIVERED` from signed Meta
      callbacks.
- [x] Use the exact Flow Manager Live Test route as the repeatable provider
      harness. Real connection data, approved-template opening sends, restart
      sends, event refresh, and the A3/A4 production roundtrips are verified.

#### 1B - Authorized inbox APIs (Complete)

- [x] Add paginated admin conversation list/detail APIs across authorized
      businesses. Production login, list, detail, and cursor reads return `200`
      against real records; unauthenticated reads return `401`.
- [x] Add paginated client conversation list/detail APIs scoped only to the
      signed-in business. Production login, list, and detail reads return `200`;
      unauthenticated reads return `401`, and a browser-supplied `businessId`
      returns `400`.
- [x] Add server-side search, status, assignment, unread, and tag filters.
      Combined real-data filters and tag relationship syntax are verified.
- [x] Add contact history and timeline projections without duplicating domain
      records in UI-specific tables. Real message/event timelines and contact
      cursor pagination are verified read-only.
- [x] Cover every read and mutation with tenant-isolation and role tests.
      Read authorization, two-business isolation, pagination, invalid input,
      not-found behavior, and sanitized failures are covered; 1B has no
      mutations.

#### 1C - Human operations and outbound reply (Complete)

- [x] Add an idempotent outbound outbox with attempt history, retry policy, and
      reconciliation. The live schema claims by tenant/key, rejects
      changed-payload key reuse, stores every attempt, schedules bounded retry
      states, and quarantines ambiguous sends for audited resolution. Both
      minute schedules are active. Visible permanent-failure treatment is an
      explicit 1D UI state.
- [x] Send a human text reply through the existing WhatsApp sender and append it
      to the same conversation timeline. Marker `LIVE-1C-HUMAN-0718` produced
      exactly one outbox row, one attempt, and one outbound message; the first
      command returned `SENT`, the identical replay returned `duplicate:true`,
      and the signed callback advanced the message to `DELIVERED`.
- [x] Enforce the WhatsApp customer-service window and require an approved
      template when free-form replies are not allowed. The live RPC blocks free
      text at or after 24 hours with `TEMPLATE_REQUIRED`; open-window, blocked,
      duplicate, changed-payload, and completion paths passed rollback-only live
      database checks with zero retained rows.
- [x] Implement open, pending, snoozed, reopened, and closed lifecycle behavior.
      Admin and signed-client `PATCH` commands atomically change the tenant row,
      reject unsafe reopen conflicts, and write idempotent actor audit events.
      Customer inbound and the protected due-snooze worker reopen conversations;
      the production minute schedule is active and verified. Exact Lovable UI
      controls are tracked in 1D.
- [x] Implement assignment/transfer, priority, internal notes, tags, unread state,
      and canned replies with audit events. The additive production schema,
      shared server services, admin/client routes, signed tenant scope,
      canned-reply audit ledger, rollback-only database verification, and
      production authorization probes are complete. Visible controls belong to
      1D.
- [ ] Keep image, document, template, and prerecorded-audio replies visible as
      `Future` until their media/template dependencies are completed.

#### 1D - Complete Flow Manager surfaces

- [x] Connect admin Live Operations list and conversation detail to the real
      admin APIs. Real list/search/filter/pagination, message and event timeline,
      service-window status, reply, lifecycle, assignment, priority, unread,
      notes, tags, and canned replies are connected. Advanced operational
      folders, template/media replies, business context, and incident actions
      remain visible, clickable, and labeled `Future`. Canonical release and
      authentication-boundary verification are complete.
- [x] Connect client Inbox list and conversation detail to the real client APIs.
      The signed-business WhatsApp list/search/pagination, timeline, reply,
      lifecycle, assignment, priority, unread, notes, tags, and canned replies
      are connected. Other channels and AI Copilot remain visible, clickable,
      and labeled `Future`. Canonical release and signed-client boundary
      verification are complete.
- [x] Connect admin and client Contacts pages to the same contact domain. Real
      list/search/pagination, lifecycle, tags, consent, and error states are
      connected for both audiences; admin profile, attributes, and conversation
      history are connected. Canonical release and both authentication-boundary
      probes are complete.
- [x] Remove every mock conversation/contact import from those promoted routes.
      Admin Live Operations, client Inbox, both Contacts lists, and the admin
      contact detail no longer import mock records. Client workspace identity
      and the shared command palette also use the signed real domain.
- [~] Add loading, empty, retry, permission, provider-failure, and disconnected
      WhatsApp states without changing the Lovable composition. Admin Live
      Operations and client Inbox have loading, empty, retry, sanitized
      API/provider failure, closed-conversation, and closed-service-window
      states. Contacts now add loading, empty, retry, and sanitized API failures;
      the explicit disconnected-number state remains.

Milestone 1 completion gate: using a real test WhatsApp number, one inbound
message appears exactly once in the correct tenant's admin and client inboxes;
an authorized human replies; sent/delivered/read or failed status appears in the
timeline; assignment, note, tag, and close/reopen actions survive reload; another
tenant cannot read or mutate the conversation.

Current implementation sequence: **Milestone 1A through 1D and Milestone 2A are
complete with accepted production gates. Milestone 2B safe draft editing is the
only active work package.**

### Milestone 2 - Guided Flow Builder and Runtime

Status: **Active - work package 2B only**

Work-package 2A status: **Complete - production release
`m2a-guided-foundation-v1` accepted.**

Work-package 2B status: **In progress - the deterministic visual-tree Guided
editor, dedicated Selected step tab, safe field-level draft editing, explicit
destinations, live validation, undo/redo, dirty-state protection, and authorized
admin/client saves with optimistic server-conflict protection are implemented.
Stable step creation, duplication, ordering, and reference-safe deletion are
also implemented for both audiences.
The map exposes at most three WhatsApp reply branches per step and visibly flags
legacy overflow, loops, missing destinations, and unconnected saved steps.
Choice creation/removal, complete problem coverage, and media replacement remain
before the 2B gate can close.**

Milestone 2 work-package contract:

| Work package                   | Deliverables                                                                                                  | Required exit evidence                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 2A Canonical Guided foundation | Shared admin/client adapters, canonical v2 step mapping, real draft/version hydration, Canvas Future boundary | No preview records; lossless load/map/reload tests; tenant denial; exact Guided desktop/mobile browser evidence. |
| 2B Safe draft editing          | Step CRUD/reorder/toggle, destinations, validation/problem navigation, undo/redo, dirty/conflict/retry states | Rejected saves retain work; broken references require repair; authorized reload preserves exact stable step IDs. |
| 2C Publish and history         | Immutable publish, version inspection/restore, media/template availability checks, pinned-version guarantees | Published snapshot cannot be mutated; restore creates a safe draft; running sessions remain pinned.             |
| 2D Simulation and runtime      | From-step simulation, sample branching, execution trace, stop/restart, inbox timeline/runtime diagnostics     | Guided-built flow passes simulation and one real inbound executes the pinned version with complete trace.        |

- [x] Make the WhatsApp-specific Lovable Guided experience the single canonical
      editor for both admin and client users. Permissions may differ, but the
      flow representation and editing behavior may not fork.
- [x] Keep Canvas visible and clickable as a labeled `Future` preview. Canvas is
      not required for Guided completion and receives no production mutation
      path during this milestone.
- [x] Map Guided steps and explicit destinations to the existing canonical v2
      flow document without introducing a second UI-owned flow format.
- [x] Load, create, duplicate, edit, reorder, enable/disable, and delete steps,
      including explicit incoming-route repair; save recoverable drafts through
      authorized APIs.
- [ ] Publish immutable versions and inspect or restore version history through
      authorized APIs in work package 2C.
- [ ] Support WhatsApp trigger, text, image, template, question, menu, branch,
      contact field, tag, assignment, handoff, wait, jump, subflow, and close
      nodes.
- [ ] Make branching understandable without graph handles: every option or
      condition names its next step, missing destinations are immediately
      visible, and deleting a referenced step requires an explicit repair.
- [ ] Provide field-level validation plus one ordered problem list that names the
      affected step, explains the issue in plain language, and navigates directly
      to the control that fixes it. Distinguish publish-blocking errors from
      warnings.
- [ ] Detect at least missing required content, invalid or unreachable targets,
      unreachable steps, dead ends, duplicate option values, unsupported node
      configuration, unavailable media/templates, and invalid start/end paths.
- [x] Protect work with dirty-state indicators, navigation warnings, retryable
      saves, server-conflict handling, undo/redo for the current editing session,
      and no fake success state after a rejected mutation.
- [ ] Persist typed answers and deterministic branch decisions.
- [ ] Write per-contact execution progress and errors into the conversation
      timeline built in Milestone 1.
- [ ] Add test simulation from any step, sample-answer branching, execution
      traces, and stop/restart controls without sending a real customer message.
- [ ] Preserve stable step IDs and published-version pinning so editing a draft
      cannot change an already-running customer session.

Completion gate: a first-time authorized user builds, validates, repairs, and
publishes a branching WhatsApp flow entirely in Guided without opening Canvas;
the editor survives reload and rejected saves without losing work; a real inbound
WhatsApp conversation executes the pinned published version; and each step,
decision, handoff, and failure is visible in the inbox timeline and diagnostics.

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
- [ ] After Meta app approval, integrate Embedded Signup for self-service
      WhatsApp onboarding, connection provisioning, callback/subscription
      verification, failure recovery, and audit history. Until then, support the
      existing manually configured live connection without presenting a signup
      link or implying that additional businesses can self-onboard.
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

| Date       | Decision                                                                                                                                           | Reason                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-16 | Flow Manager is the target UI, not a second deployed app.                                                                                          | The main app already owns working routes, APIs, auth, Supabase, and deployment.                                                                                                                                              |
| 2026-07-16 | Current product scope is WhatsApp only.                                                                                                            | Focus engineering on a complete messaging and workflow product.                                                                                                                                                              |
| 2026-07-16 | AI agents are deferred.                                                                                                                            | Deterministic flow reliability and operations come first.                                                                                                                                                                    |
| 2026-07-16 | Audio means prerecorded outbound responses plus inbound transcription.                                                                             | No generated voice or AI phone calls are required.                                                                                                                                                                           |
| 2026-07-16 | Future features stay clickable as labeled previews.                                                                                                | Keep the product vision visible without claiming fake functionality.                                                                                                                                                         |
| 2026-07-16 | Order behavior uses protected backend actions with constrained admin configuration.                                                                | Preserve price, inventory, idempotency, and order-state integrity.                                                                                                                                                           |
| 2026-07-16 | Target workflow quality is respond.io-grade for WhatsApp, not omnichannel parity.                                                                  | Build strong triggers, steps, branches, operations, testing, and execution history around WhatsApp.                                                                                                                          |
| 2026-07-16 | New Connect routes reuse the legacy server-side Vercel environment contract.                                                                       | Preserve deployed dashboard, Supabase, and WhatsApp configuration without exposing secrets to the browser or creating a second configuration system.                                                                         |
| 2026-07-16 | Flow Manager owns the new UI; legacy route components cannot be embedded in it.                                                                    | Reuse proven backend behavior without creating a visually inconsistent hybrid product.                                                                                                                                       |
| 2026-07-16 | The checked-out Flow Manager route/component tree is the canonical UI baseline.                                                                    | Backend adapters must make the supplied product functional without substituting a custom shell or redesigned page composition.                                                                                               |
| 2026-07-17 | `https://doubleacode.com` is the canonical production origin.                                                                                      | Production acceptance must test the real deployed product consistently; a hosting redirect to `www` is an alias, not a different environment.                                                                                |
| 2026-07-17 | `saeed-ahmar-s-projects/double-a-code-portfolio` is the production Vercel project.                                                                 | Deployment acceptance requires evidence that this project built the tested Git commit and assigned both production aliases; a successful Git push alone is insufficient.                                                     |
| 2026-07-17 | Meta app review is pending; production currently has one manually configured live WhatsApp connection.                                             | Active milestones must preserve and test against that connection. Embedded Signup and self-service WhatsApp onboarding stay Future until Meta approval and approved credentials are verified.                                |
| 2026-07-18 | Supabase Cron and service-role-only runtime controls own minute worker scheduling and rollout activation; Vercel dashboard access is not required. | Supabase supports one-minute jobs beside the durable state. Vault retains the raw worker bearer, the database stores only its digest, and the public release endpoint proves automatic deployment from the canonical origin. |
| 2026-07-18 | Guided uses a vertical master-detail editor instead of the Lovable horizontal step-card strip. | The connected real flow exposed the strip's poor scanability and editing context. The user explicitly authorized this route-level departure so steps remain vertically navigable while the selected step's copy, choices, destinations, behavior, and problems stay together. The shared Flow Manager shell and visual language remain canonical. |
| 2026-07-18 | Guided uses a deterministic visual conversation tree with a dedicated Selected step tab and no more than three reply branches per step. | The user selected the centered start, reply-path, and child-card layout for at-a-glance routing, plus tab-based editing for a clean workspace. It derives from canonical data and is not the freeform Canvas. |
| 2026-07-19 | Guided draft saves use a monotonic version revision and an atomic compare-and-swap update. | Concurrent admin or client sessions must never silently overwrite a newer draft. A stale save returns `409 FLOW_DRAFT_CONFLICT`, keeps local edits open, and requires an explicit reload instead of auto-merging or claiming success. |
| 2026-07-19 | Guided step ordering changes saved presentation order only; routes continue to target stable node IDs. Referenced non-start steps can be deleted only after the user explicitly redirects all inbound routes to one surviving step or removes those destinations. | Reordering must not silently alter conversation behavior. Explicit repair prevents dangling references, while keeping the start step undeletable in 2B avoids an implicit trigger/start migration before those rules are designed. |

## Roadmap Changelog

Earlier entries preserve the migration history. The latest entry and the
current-status sections above define the active implementation state.

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-16 | Created the living roadmap from the existing implementation audit and product-scope decisions.                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Existing Connect suite: 37 tests passed. Current typecheck blocked by missing local `@xyflow/react` installation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-07-16 | Synchronized dependencies; added the shared Connect feature registry, status treatments, admin/client shells, authenticated client home, legacy tool bridges, and clickable Future Work previews; repaired `/connect` route nesting so child workspaces render.                                                                                                                                                                                                                                                                                             | Production build passed; typecheck passed; 37 tests passed; `/connect`, `/connect/client`, and `/connect/admin` verified in desktop and 390px mobile browser layouts with no current console errors.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-07-16 | Connected client Automations to business-scoped canonical flow APIs using the existing `WA_DASHBOARD_*`, Supabase, and WhatsApp Vercel contracts; added real template cloning, visual editing, image upload, draft save, checkout-setting save, validation, version display, and publishing. Expanded `.env.example` with the legacy primary, partner, and internal-admin variable names.                                                                                                                                                                   | Production build passed; typecheck passed; 38 tests passed; scoped ESLint passed, including a tenant-authorization regression test.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-07-16 | Corrected the UI migration boundary: removed the embedded legacy admin editor from the client route, restored legacy admin media handling to its own route, ported the Flow Manager light workspace theme and navigation, and added a Flow Manager-native canonical editor with real data and mutations.                                                                                                                                                                                                                                                    | Production build, typecheck, and scoped ESLint passed; 39 tests passed, including a regression test forbidding legacy editor and mock-data imports in the client Flow Manager; login verified at desktop and 390px mobile with no overflow or browser errors.                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-07-16 | Reset the Connect presentation to the exact checked-out Flow Manager UI: registered the source as the `flow-manager/` submodule, ported its admin/client routes and components under `/connect`, removed the custom shell/editor approximation, replaced old dashboard child pages with redirect-only compatibility shims, preserved existing auth and backend foundations, disabled mock success toasts, and added persistent Preview/Future Work mutation guards.                                                                                         | Production build, typecheck, and scoped ESLint passed; 39 tests passed; client login boundary, exact Home, Automations list/canvas, mutation blocking, Future Work labeling, and 390px responsive containment verified in browser.                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-07-16 | Mapped every exact Lovable admin/client route to an existing backend, additive schema, derived read model, new domain, or Future Work status. Added the idempotent `wa_flow_manager_core_schema.sql` migration for tenant-scoped contacts, tags, inbox conversations/messages/events, canned replies, user metadata, and reusable media, including checkout-customer backfill and service-role-only RLS access.                                                                                                                                             | Static schema contract test added; 40 tests pass. Migration deployment and live Supabase verification remain pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-07-16 | Promoted the exact Lovable client Automations route to its first real adapter: authenticated workspaces now load the authorized business's canonical flow/version summary through the existing Vercel-backed dashboard API, while the supplied canvas and mutations remain visibly preview-only. Updated the mechanical port tool to preserve promoted connected routes during future Lovable refreshes.                                                                                                                                                    | Port refresh preserved the connected route byte-for-byte; production build, typecheck, scoped ESLint, and all 40 Connect tests passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-07-16 | Added a central Flow Manager feature-status registry and visible `Future` markers to every incomplete admin/client navigation destination, page, and internal tab. The connected Automations list tab is exempt while its unfinished Canvas remains marked. The port tool now reapplies sidebar badges after every canonical Lovable refresh.                                                                                                                                                                                                               | Port refresh retained the status treatment; typecheck, scoped ESLint, and all 40 Connect tests passed. Desktop/mobile browser and production-build verification recorded with this change.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-07-17 | Deployed `wa_flow_manager_core_schema.sql` to the live Supabase project after prerequisite checks and a scoped snapshot of the existing business-user and customer-profile tables. The migration added the Flow Manager contact, tag, media, inbox conversation/message/event, canned-reply, and workspace metadata foundations without replacing the existing WhatsApp business data.                                                                                                                                                                      | Transaction completed successfully. All eight new tables are REST-accessible, RLS-enabled, and granted to `service_role`; two customer profiles were backfilled to two contacts; the existing active business and active WhatsApp connection remained active.                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-07-17 | Promoted the exact Flow Manager admin Businesses route group to a real adapter. The list now loads authenticated Supabase business, owner, WhatsApp connection, health, and setup data; search and status filters are functional; real business IDs open a live setup checklist. Connected route files are preserved during future Lovable refreshes while creation and deeper configuration actions remain labeled Future.                                                                                                                                 | Production build, typecheck, scoped ESLint, and all 40 Connect tests passed. An ephemeral local admin session verified the two live Supabase business records, filtering, row navigation, the real 10/11 setup checklist, zero console errors, and no page overflow at 1440px or 390px.                                                                                                                                                                                                                                                                                                                                                           |
| 2026-07-17 | Replaced the feature-area phase list with an ordered milestone roadmap and execution contract. Milestone 1 is now the only active product scope: complete WhatsApp Operations from webhook persistence through tenant-safe inbox APIs, human reply/outbox, delivery state, lifecycle, assignment, notes, tags, contacts, and both exact Flow Manager inboxes. Unrelated page-family integration is paused until the end-to-end gate passes.                                                                                                                 | Roadmap now defines one active milestone, dependency order, explicit non-goals, required database/server/UI/security/test/deployment work, and an observable completion gate for every milestone.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-07-17 | Implemented Milestone 1A's durable inbound foundation. The existing verified WhatsApp webhook now persists tenant-scoped contacts, conversations, inbound messages, creation events, unread state, and retry-safe processing claims before deterministic flow execution. Meta delivery webhooks now target a monotonic timeline-status RPC. The additive processing table and three service-role-only RPCs were deployed to the live Supabase project.                                                                                                      | Live SQL verification confirmed the processing table, all three RPCs, service-role execution, and denial for authenticated users. Typecheck, scoped ESLint, all 42 Connect tests, the production build, and `git diff --check` passed. Vercel deployment and a real Meta webhook smoke test remain before dual-write is marked complete.                                                                                                                                                                                                                                                                                                          |
| 2026-07-17 | Expanded the roadmap from a product milestone outline into the Connect delivery control document. Added document ownership, audited baseline and stack, repository and architecture boundaries, connection/environment/secret registers, data ownership, API conventions, active-business cutover and rollback, Definition of Ready/Done, verification and release runbooks, observability, risk ownership, milestone controls, and exact Milestone 1 work-package evidence. Tightened workspace instructions so queued work cannot bypass the active gate. | Cross-checked against the main and Lovable package manifests, Vercel/Vite configuration, environment-key inventory, server auth and connection resolution, Flow Manager port/status registry, deployed schema/RPC sources, API route families, backend map, and current tests. Documentation-only change; runtime behavior is unchanged.                                                                                                                                                                                                                                                                                                          |
| 2026-07-17 | Recorded `https://doubleacode.com` as the canonical production origin and populated the public-site example configuration.                                                                                                                                                                                                                                                                                                                                                                                                                                  | Future deployment, browser, API, and webhook acceptance evidence must start from the canonical origin and may record Vercel's redirect to `www` as hosting behavior.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-07-17 | Authenticated the Vercel CLI by device flow, linked the workspace to `saeed-ahmar-s-projects/double-a-code-portfolio`, and audited the production deployment and secret-safe environment-key inventory. Initial deployment-list output appeared stale and led to an incorrect blocked-release diagnosis; the Vercel dashboard and a refreshed CLI subsequently confirmed that automatic `main` deployments were being created successfully.                                                                                                                 | Vercel project ID, aliases, framework, production environment key names, GitHub repository ID, production branch, and deployed commit were verified without printing secret values. The incorrect blocked-deployment conclusion is superseded by the production evidence in the following entry.                                                                                                                                                                                                                                                                                                                                                  |
| 2026-07-17 | Confirmed the Milestone 1A application release in production. Automatic Git deployment `dpl_HLUy4m4Doj7p69D3YaKWSTafr1H2` built full commit `5f059bf61bf4015d14d249ce835a96c8d7c016cc`, reached Ready, and received `doubleacode.com` and `www.doubleacode.com`.                                                                                                                                                                                                                                                                                            | The canonical origin redirected to `www`; the new Businesses page title marker was live; unauthenticated Businesses API returned `401`; session diagnostics returned `configured: true`; desktop and 390px checks had no console errors or horizontal overflow. A secret-safe probe found both current production internal account pairs returned `401`, so authenticated live-data verification and the real Meta inbound/retry/status smoke remain open. Temporary pulled-environment and smoke files were deleted.                                                                                                                             |
| 2026-07-17 | Verified automatic deployment a second time after correcting the roadmap. Documentation commit `587a7bf` independently triggered production deployment `dpl_Bb3Lbsh73VrYhLDLPSLm7ZaaUGgf`.                                                                                                                                                                                                                                                                                                                                                                  | The deployment reached Ready and received both canonical production aliases, confirming that Git-triggered `main` deployment is operating repeatedly. This evidence changes release diagnosis only; it does not complete the authenticated data or real Meta smoke gates.                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-07-17 | Completed the authenticated production read smoke using credentials supplied through a temporary Git-ignored local file. Login, session, and Businesses API returned `200`; the API returned two live business records, and the exact Businesses UI rendered them at the canonical production origin. The active business reports Live, 100% setup, WhatsApp Active, Health OK, and 10/11 checklist completion.                                                                                                                                             | Browser verification at 1280px found no console warnings/errors or horizontal overflow. The real record differs from Lovable examples, proving that the Businesses adapter is using Supabase. The WhatsApp Connection, Live Test, and Diagnostics child routes were confirmed to remain static preview implementations with unrelated numbers and simulated outcomes; they are not valid live-test evidence. The only incomplete real setup item is receipt of a real WhatsApp test message.                                                                                                                                                      |
| 2026-07-17 | Promoted the exact Lovable WhatsApp Connection page from illustrative data to a real read/health adapter. It now renders the selected Supabase connection and calls an internal-admin-authorized endpoint that checks the configured phone identity through Meta Graph using runtime-only credentials, an eight-second timeout, and sanitized results. Added a CLI preflight that refuses Vercel masked placeholders, repaired stale reliability checks, and added `WHATSAPP_CONNECTION_SUFFIXES=2` to Vercel Production and Preview.                       | Commit `a4e5fe2` passed the production build, typecheck, scoped lint, all 42 main tests, all 13 reliability tests, and `git diff --check`. Deployment `dpl_37TyX7wdzEjTYt3CpYMn3UUrzDSP` reached Ready and serves both canonical aliases. Authenticated production browser checks showed the real business values, Meta HTTP `200`, matched identity, `GREEN` quality, zero browser warnings/errors, and no horizontal overflow at 1280px or 390px. Real inbound/retry/status evidence remains open.                                                                                                                                              |
| 2026-07-17 | Began the real-provider Milestone 1A smoke with marker `LIVE-1A-0717-A1`. Expanded the admin-only WhatsApp health adapter beyond phone identity to inspect the current Meta app, app-level WhatsApp callback and `messages` subscription, and WABA app subscription using runtime-only credentials; the exact connection page now reports each layer separately.                                                                                                                                                                                            | A secret-safe production Supabase audit found no signed Meta `POST`, durable message, processing claim, or diagnostic event after the marker was sent; the existing webhook logs contained only earlier deliberate invalid probes. This local diagnostic release passed typecheck, scoped lint, all 42 main tests, all 13 reliability tests, production build, and `git diff --check`; deployment and live subscription diagnosis are next.                                                                                                                                                                                                       |
| 2026-07-17 | Deployed the first subscription diagnostic as `dpl_8rbcVfyq2ovuhKDemk5ai7gCYrhz`; production reported a matched callback, active `messages` subscription, and at least one WABA app subscription. A 90-day secret-safe audit then proved historical inbound, bot responses, and sent/delivered/read callbacks, but on a different phone-number ID from the current active Meta test number. Tightened the check to compare the exact current app ID and added an audited admin repair action that subscribes that app to the selected WABA.                 | The canonical aliases served commit `6f8686a`; authenticated production health was Meta HTTP `200`, matched identity, matched callback, active `messages`, and `GREEN` quality. The current number still had no inbound event. The next deployment must run the exact current-app comparison, repair if necessary, and repeat the provider marker before 1A can close.                                                                                                                                                                                                                                                                            |
| 2026-07-17 | Deployed exact current-app/WABA verification and the audited repair control as `dpl_75ZqQdT419QCNbFaom5XCcixChQP` from commit `f2036d0`. The authenticated production check compared app IDs and confirmed the current app is already subscribed, with the expected callback, active `messages` field, matched phone identity, and `GREEN` quality; the repair mutation was therefore not invoked.                                                                                                                                                          | Both canonical aliases serve the Ready deployment. A final four-hour database audit still found no signed Meta `POST` or marker `LIVE-1A-0717-A1`. Historical records prove an older phone-number ID and recipient ending `5749` completed inbound, bot reply, sent, delivered, and read cycles. The remaining provider smoke requires a fresh outbound thread on the current test number and a reply from the verified recipient; no 1B work has started.                                                                                                                                                                                        |
| 2026-07-17 | Connected the exact Flow Manager business Live Test route to the real admin-authorized WhatsApp services. It now reads the selected Supabase connection, can send the approved `hello_world` template to open a compliant test conversation, can send `/restart` inside an open customer-service window, and refreshes sanitized real message events. Added reusable template sending to the shared Meta sender and extended the existing audited demo-send API without hardcoding the test recipient.                                                      | Deployment `dpl_7oBVoRU3GvrSS4dUCKZ9PNjyu8rv` rendered the real connection/events and exposed the partial-page Future guard intercepting connected actions. Commit `a965221` fixed that boundary without removing the partial/Future label. The exact user-confirmed historical recipient then received and read the approved template: production recorded the outbound provider ID plus signed `sent`, `delivered`, and `read` callbacks with HTTP `200`. The failed mistyped-recipient attempt remains sanitized and visible for diagnosis. Await marker `LIVE-1A-0717-A2` to complete inbound/idempotency evidence.                           |
| 2026-07-17 | Marker `LIVE-1A-0717-A2` reached the current production webhook with a valid Meta signature and correct current phone/business routing. Vercel raw logs proved five deliveries of the same provider message ID, all failing before flow execution because `wa_ingest_inbound_message` resolved its `message_id` output column ambiguously against the processing-table conflict target. Corrected the canonical migration and added the function-only `wa_messaging_operations_rpc_message_id_fix.sql` repair plus a regression assertion.                  | The additive repair was applied through the Supabase SQL editor. Postflight confirms the deployed definition uses `wa_inbound_message_processing_pkey`, preserves service-role execute, denies authenticated execute, and passes a rollback-only transactional ingest without retaining synthetic data. Typecheck, scoped lint, all 42 main tests, all 14 reliability tests, and `git diff --check` pass. Meta did not retry A2 after repair; fresh marker `LIVE-1A-0717-A3` is required for final persistence, idempotency, bot-response, and status evidence.                                                                                   |
| 2026-07-17 | Marker `LIVE-1A-0717-A3` completed the repaired real-provider roundtrip on the current production number. The signed inbound callback returned HTTP `200`, routed to the active business/connection, persisted exactly one customer message, completed one processing claim on its first attempt, and produced exactly one deterministic bot response. The bot response then received signed `sent`, `delivered`, and `read` callbacks.                                                                                                                     | A controlled replay of the exact A3 provider message ID through the deployed service-role ingest RPC returned `inserted=false` and `shouldProcess=false`; postflight still showed one inbound row, one processing attempt, and one bot response. This closes the provider persistence/idempotency gate. During evidence review, the durable conversation was found not yet to copy the already-pinned runtime flow/version/node, so 1A remains open for the explicit linkage hook and an A4 production check before 1B.                                                                                                                           |
| 2026-07-17 | Added the final Milestone 1A runtime-to-inbox linkage. A service-role-only RPC now tenant-validates the pinned business flow/version, updates the durable conversation's flow/version/node atomically, and records idempotent `FLOW_STARTED` plus human-handoff `FLOW_STOPPED` timeline events. The webhook copies the saved session linkage before completing the inbound processing claim.                                                                                                                                                                | The additive function is live in Supabase; service-role execute is allowed, authenticated execute is denied, and a rollback-only active-session linkage test passed. Typecheck, scoped lint, 43 main tests, 14 WhatsApp reliability tests, production build, and diff checks passed. Vercel deployment `dpl_4kxYkQpdeq9nVB5JHmNteFEE7EQd` built exact commit `f59b474`, reached Ready, and received both canonical aliases. Fresh A4 provider evidence remains before 1A closes.                                                                                                                                                                  |
| 2026-07-17 | Closed Milestone 1A with real marker `LIVE-1A-0717-A4` on production deployment `dpl_DfJRuhYoY2qubjYveKd2bgfnywLN` from commit `a7bb544`. The signed callback returned HTTP `200`, persisted exactly one inbound message, completed one processing claim on attempt one, and produced one bot response with `sent` and `delivered` callbacks. The durable conversation copied the active session's tenant, pinned flow, immutable version, and current node.                                                                                                | Production showed exact flow/version/node equality and one matching `FLOW_STARTED` event. A rollback-only postflight invoked the handoff linkage twice and asserted one `FLOW_STARTED` plus one human-handoff `FLOW_STOPPED`, proving timeline idempotency without retaining synthetic state. Together with A3's exact-provider-ID duplicate rejection and `sent`/`delivered`/`read` callback chain, every 1A exit condition is satisfied. Work package 1B is now authorized.                                                                                                                                                                     |
| 2026-07-17 | Recorded the current Meta rollout constraint: the app remains under review and only the existing manually configured production WhatsApp connection is available. Embedded Signup and multi-business self-service connection onboarding are explicitly deferred to Milestone 4 after Meta approval.                                                                                                                                                                                                                                                         | Roadmap-only clarification. Milestones 1-3 must preserve the active connection and require no Embedded Signup dependency; onboarding UI remains labeled Future and must not expose a nonfunctional signup link.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-07-17 | Implemented the Milestone 1B authorized inbox read slice: one shared Supabase query service now provides deterministic opaque-cursor conversation/contact lists, conversation timelines, contact history, validated filters, and sanitized projections. Added admin and signed-business client list/detail route families, while keeping the Lovable Inbox and Contacts screens unchanged and labeled Future. Pinned the application runtime to Node `22.x`.                                                                                                | Typecheck, scoped ESLint, 51 main tests, 14 WhatsApp reliability tests, production build, read-only live Supabase pagination/filter/timeline/cross-tenant checks, and authenticated local HTTP route checks pass. Production deployment and canonical-origin API smoke remain before 1B completion.                                                                                                                                                                                                                                                                                                                                               |
| 2026-07-17 | Released the exact Milestone 1B implementation from commit `63cc2f3` and corrected the Vercel project runtime from Node `24.x` to the repository-required Node `22.x`. Production deployment `dpl_HE8FEZGtSHFXNzC9K7hcH7o4XYMi` reached Ready and received both canonical aliases.                                                                                                                                                                                                                                                                          | `doubleacode.com` redirects to `www`; the exact Businesses release marker returns `200`; and the deployed admin/client conversation and contact route families each return `401` without a session. Authenticated local HTTP checks against live Supabase return real records, enforce signed-business scope, reject a browser `businessId` override with `400`, and deny cross-tenant IDs. The in-app admin and Vercel sessions expired before the equivalent authenticated canonical-origin read could be repeated, so that read-only check remains the final 1B release gate.                                                                  |
| 2026-07-17 | Audited the flow-editing mismatch and made Guided the product-standard editor for Milestone 2. The current client Automations card reads a real flow summary, but both Lovable editor variants remain hard-coded previews and neither edits the canonical flow. The WhatsApp-specific Guided experience will be shared by admin and client; Canvas remains visible, clickable, and labeled `Future`.                                                                                                                                                        | Added an explicit Guided acceptance contract covering the canonical v2 mapping, complete draft/version lifecycle, permission consistency, understandable branching, field-level and flow-level validation, direct problem navigation, safe deletion repair, dirty/conflict/retry handling, undo/redo, simulation, stable step IDs, and real pinned-version execution. No runtime behavior changed in this roadmap-only correction.                                                                                                                                                                                                                |
| 2026-07-17 | Closed Milestone 1B using a fresh secret-safe production smoke against the exact deployed inbox APIs. Both real login boundaries returned `200` and issued authenticated sessions; admin and client conversation/contact lists and available details returned real records with `200`; admin contact cursor pagination returned the next page with `200`.                                                                                                                                                                                                   | Unauthenticated admin/client reads returned `401`, and the client API rejected a browser-supplied partner `businessId` with `400`. The partner tenant currently has no contact row for a live cross-tenant detail probe, so two-business ID denial remains covered by the automated contract suite and local HTTP checks against live Supabase. The Git-ignored credential and smoke files were deleted immediately after the successful run. Work package 1C is now authorized.                                                                                                                                                                  |
| 2026-07-17 | Implemented the first controlled Milestone 1C human-reply slice without enabling provider sends. Added a tenant-scoped durable outbox and attempt ledger, atomic claim/completion RPCs, changed-payload idempotency conflict detection, bounded retry state, 24-hour service-window enforcement, admin/client text-reply command routes, signed client scope, existing Meta sender integration, and an exactly-`true` default-off kill switch. Diagnostic event failure can no longer turn an accepted provider send into a false sender failure.           | Applied the idempotent migration to live Supabase. Both tables have RLS, service-role access, and explicit anonymous/authenticated denial; both RPCs are service-role-only. Live rollback-only checks passed open-window claim, duplicate suppression, altered replay rejection, successful completion, and closed-window `TEMPLATE_REQUIRED`, then confirmed zero retained test outbox/message rows. Typecheck, scoped lint, 59 main tests, 14 WhatsApp reliability tests, production build, and diff checks passed; repository-wide lint remains blocked by pre-existing Lovable-clone CRLF/style debt outside this slice.                      |
| 2026-07-17 | Released the default-off Milestone 1C foundation from commit `7b16e16`; Vercel reported the exact commit successful. The canonical admin and client human-reply POST routes are present and return the sanitized authentication contract without a session, while the signed production Businesses UI continues to load real data.                                                                                                                                                                                                                          | Both route probes returned `401` with `UNAUTHORIZED`. A post-release live database audit returned `0` human outbox rows, `0` attempts, and `0` durable human messages. No provider send was attempted and the kill switch was not activated; controlled activation remains gated on retry claim/reconciliation support.                                                                                                                                                                                                                                                                                                                           |
| 2026-07-17 | Implemented the Milestone 1C retry and reconciliation slice. Added a protected outbox processor, due-retry leases, service-window revalidation, expired-send quarantine, completion-write recovery, and internal-admin reconciliation decisions for confirm-sent, confirm-failed, or retry with actor/time audit fields. Provider sends and scheduling remain default-off rollout controls.                                                                                                                                                                 | The additive migration is live and service-role-only. Two forced-rollback production suites passed attempt-2 retry, unknown-outcome quarantine, closed-window blocking, and all three reconciliation decisions; postflight retained `0` outbox rows, `0` attempts, `0` human messages, and `0` test keys. The production build, typecheck, scoped ESLint, `66/66` main tests, `14/14` WhatsApp reliability tests, and diff checks pass; deployment verification remains.                                                                                                                                                                          |
| 2026-07-17 | Released the retry/reconciliation slice from exact commit `2ff784b`. GitHub's Vercel check reached success and the canonical Connect page continued to serve after promotion.                                                                                                                                                                                                                                                                                                                                                                               | `doubleacode.com` redirected to `www`; production reconciliation `GET`, reconciliation `POST`, and outbox processor `POST` each returned sanitized `401 UNAUTHORIZED` without credentials. The live database still held zero human outbox, attempt, and human-message rows, and provider sending remained off.                                                                                                                                                                                                                                                                                                                                    |
| 2026-07-18 | Implemented the next Milestone 1C lifecycle slice. Added shared admin/client lifecycle commands, atomic tenant-scoped status transitions, bounded snoozing, idempotent actor audit events, active-conversation reopen protection, closed-state transition guards, customer-inbound wake behavior, and a protected due-snooze worker using the generic Connect worker bearer.                                                                                                                                                                                | The additive lifecycle migration is live. Service-role execution is allowed and authenticated execution denied. Forced-rollback production suites passed pending, snooze, open, close, reopen, duplicate, changed-payload conflict, closed-state rejection, inbound wake, and due wake paths; postflight restored the live conversation to `OPEN` with zero synthetic messages/events. The production build, typecheck, scoped ESLint, `72/72` main tests, `14/14` WhatsApp reliability tests, and diff checks pass; deployment verification remains.                                                                                             |
| 2026-07-18 | Released the lifecycle slice from exact commit `34918c5`. GitHub's Vercel production check reached success and the canonical Connect Businesses page continued to serve after promotion.                                                                                                                                                                                                                                                                                                                                                                    | Unauthenticated production probes for the admin lifecycle `PATCH`, signed-client lifecycle `PATCH`, and protected lifecycle worker `POST` each returned sanitized `401 UNAUTHORIZED`. Manual status UI and schedule activation remain gated; the database behavior is live and verified.                                                                                                                                                                                                                                                                                                                                                          |
| 2026-07-18 | Implemented the remaining Milestone 1C collaboration command foundation. Added one strict admin/client `PATCH` contract for priority, assignment/transfer/unassignment, and unread state; dedicated internal-note and contact-tag routes; tenant-scoped inbox option reads; and audited canned-reply create/update/archive routes. Internal notes remain timeline-only and are never sent to WhatsApp.                                                                                                                                                      | The additive collaboration migration is live. All four RPCs allow service-role execution and deny authenticated/anonymous execution; the canned-reply audit table has RLS. The checked-in rollback harness passed priority, assignment, transfer, cross-tenant rejection, unassignment, read/unread, note, tag, canned create/update/archive, duplicate, and changed-payload conflict assertions, then postflight confirmed zero retained events, audits, users, tags, contact-tags, or canned replies. Build, typecheck, scoped ESLint, `80/80` main tests, `14/14` reliability tests, and diff checks pass; route deployment/probes remain.     |
| 2026-07-18 | Released the collaboration command foundation from exact commit `db0bbd0`. GitHub's automatic Vercel production check succeeded; `doubleacode.com` redirected to `www` and the exact Connect Businesses page returned `200`.                                                                                                                                                                                                                                                                                                                                | Unauthenticated production probes for admin/client conversation `PATCH`, internal-note `POST`, contact-tag `PUT`, inbox options, and canned replies all returned sanitized `401 UNAUTHORIZED`. Collaboration commands are complete as a backend capability; their exact Lovable controls remain correctly gated to 1D.                                                                                                                                                                                                                                                                                                                            |
| 2026-07-18 | Added and applied idempotent minute schedules plus database-backed rollout controls. Supabase Cron now wakes due snoozes and triggers the human outbox every minute. The raw worker bearer will be generated inside Postgres and retained only in Vault; Vercel verifies it through a service-role-only digest RPC. Human sending is controlled by a separate default-off database flag, with legacy environment controls retained as aliases.                                                                                                              | Production installed `pg_cron`, `pg_net`, and `pgcrypto`; exactly two named jobs are active and repeatedly successful. Lifecycle returns one result row, while outbox returns zero rows because no bearer exists. Both control tables have RLS and no table grants; service role alone can execute the two RPCs. The human-send flag is false, an unknown bearer is false, and the credential count is zero. Build, typecheck, scoped ESLint, `84/84` main tests, `15/15` reliability tests, and diff checks pass. Automatic deployment, release-header verification, bearer activation, and one real reply remain.                               |
| 2026-07-18 | Released runtime controls from commit `2ef11af` without Vercel dashboard access. The canonical release endpoint returned `X-Connect-Release: m1c-runtime-controls-v1`; Supabase generated a 256-bit bearer internally, stored the raw value only in Vault, stored one matching digest, and activated the existing minute outbox job. Added worker authorization to the same admin human-reply command so the controlled provider proof needs no interactive admin credential and remains auditable as `connect-worker`.                                     | The public marker changed from `404` to `200` after the automatic deployment. Consecutive scheduled outbox requests returned authenticated `200` with `sendEnabled:false` and zero candidates, proving bearer authorization and the independent default-off send flag. The worker reply path passes the full `84/84` main suite, typecheck, scoped ESLint, and diff checks. Its new release marker and real provider reply remain.                                                                                                                                                                                                                |
| 2026-07-18 | Closed Milestone 1C on worker-reply release `m1c-worker-reply-v1` from commit `987d755`. Fresh customer marker `LIVE-1C-HUMAN-0718` reopened the real conversation and service window; the controlled human command then created one durable text reply and Meta accepted it on attempt one.                                                                                                                                                                                                                                                                | Production returned `SENT` for the first command and `duplicate:true` with the same outbox/message IDs for the exact replay. Durable postflight found one outbox row, one `200` attempt, one message row, and a signed Meta callback advanced it to `DELIVERED`. The database send flag was restored to false; a new key then returned `503 HUMAN_SEND_DISABLED` with zero outbox rows. Both minute cron jobs remain successful and the authenticated outbox worker returns `200` with `sendEnabled:false`. Work package 1D is now authorized.                                                                                                    |
| 2026-07-18 | Implemented the first Milestone 1D Flow Manager surface without redesigning the Lovable composition. Admin Live Operations now uses one browser adapter over the tenant-safe admin APIs for real list/detail reads and the completed 1C commands. Unsupported operational folders, templates, media, business context, and incident controls remain clickable and explicitly labeled `Future`; the promoted route is labeled `In progress`, not falsely complete.                                                                                           | Authenticated local browser verification against production Supabase rendered the live conversation, inbound markers, real flow/version/node trace, and delivered human reply. The disabled-send control produced visible `HUMAN_SEND_DISABLED` feedback with no fake success; the Template control produced a Future notice. Desktop `1280x720` and mobile `390x844` have no document overflow and keep the composer visible. Typecheck, scoped ESLint, `88/88` main tests, `15/15` reliability tests, production build, and diff checks pass. Canonical `m1d-admin-inbox-v1` deployment verification remains before client Inbox is authorized. |
| 2026-07-18 | Released the first Milestone 1D surface from exact commit `dd09e7e` without requiring Vercel dashboard access. | The canonical release endpoint returned `200`, `X-Connect-Release: m1d-admin-inbox-v1`, and capability `admin-live-operations`. The deployed admin conversations API returned sanitized `401 UNAUTHORIZED` without a session, preserving its server boundary. Client Inbox was then authorized. |
| 2026-07-18 | Implemented the second Milestone 1D surface by connecting the exact Lovable client Inbox to the signed-business APIs and shared 1C controls. WhatsApp is the only real channel; Instagram, Messenger, Webchat, Email, templates, media, and AI Copilot remain visible, clickable, and labeled `Future`. Removed Lovable conversation/workspace samples from the promoted route, workspace switcher, sidebar identity, AI panel, and shared command palette; the palette now reads real tenant-scoped conversations. | Authenticated local client browser verification against production Supabase rendered `Double A Test Business`, the real conversation and durable timeline, and the delivered human reply. A client reply while sending was disabled showed `HUMAN_SEND_DISABLED`; Future channel and AI controls showed explanatory notices with no fake mutation. Desktop `1280x720` and mobile list/detail `390x844` have no document overflow and keep the composer reachable. Typecheck, scoped ESLint, `89/89` main tests, `15/15` reliability tests, production build, and diff checks pass. Canonical `m1d-client-inbox-v1` deployment and signed-client boundary probes remain. |
| 2026-07-18 | Released the second Milestone 1D surface from exact commit `5b3eb6a` without requiring Vercel dashboard access. | The canonical release endpoint returned `200`, `X-Connect-Release: m1d-client-inbox-v1`, and capability `client-whatsapp-inbox`. The deployed client conversations API returned sanitized `401 UNAUTHORIZED` without a session, preserving its signed-business boundary. Admin and client inbox surfaces are complete; Contacts is now authorized. |
| 2026-07-18 | Implemented the final Milestone 1D Contacts surface without replacing the Lovable composition. Admin and signed-client lists now use the shared tenant-safe contact API for real search, cursor pagination, lifecycle, tags, consent, and timestamps; admin profile adds real attributes and conversation history. Create, import, export, bulk changes, broadcasts, spend, and non-WhatsApp channels remain visible, clickable, and labeled `Future` with no fake mutation or success. | Authenticated local browser checks against production Supabase rendered the two real `Double A Test Business` contacts in both audiences, filtered each list server-side, opened the real admin profile and conversation history, and showed explanatory Future notices. Desktop `1280x720` and mobile `390x844` had no document overflow; wide tables scroll within their own container. Typecheck, scoped ESLint, `91/91` main tests, `15/15` reliability tests, production build, and diff checks pass. Canonical `m1d-contacts-v1` deployment and both unauthenticated API-boundary probes remain. |
| 2026-07-18 | Released the final Milestone 1D Contacts surface from exact commit `3a13a82` and accepted the Milestone 1 production gate. | The canonical endpoint returned `200`, release `m1d-contacts-v1`, and capability `contacts`; deployed admin and client Contacts reads each returned sanitized `401 UNAUTHORIZED` without a session. Authenticated local browser journeys used production Supabase because a production UI credential was not available; this is the recorded residual risk. Rollback is code-only by reverting `3a13a82`; no schema changed, existing business/connection data is untouched, and human provider sending remains disabled. Milestone 2A Canonical Guided foundation is now the only authorized work package. |
| 2026-07-18 | Implemented the Milestone 2A canonical Guided foundation in the exact Flow Manager admin builder and client Automations presentation. Both audiences now use one shared canonical-v2 mapper and workspace for real flow/version selection, ordered stable steps, saved copy/media/options/destinations, preview, recorded validation, and advanced JSON inspection. Canvas and every mutation remain visible, clickable, labeled `Future`, and produce explanations without saving or fake success. | Lossless mapper tests cover draft preference, explicit immutable-version inspection, stable IDs/order, destinations, diagnostics, unsupported schemas, and canonical reload. Authenticated local browser checks against production Supabase loaded the same real `Greeting + Store Info image test v6` draft with 8 steps in admin and client, selected a saved image step by stable ID, rendered its real media, verified deferred Save messaging, and measured a `390x844` client viewport with no document overflow. Typecheck, scoped ESLint, `94/94` main tests, `15/15` reliability tests, the production build, and diff checks pass. Canonical deployment and denied production API-boundary evidence remain in the release gate. |
| 2026-07-18 | Released commit `470a338` as Milestone 2A and accepted its production gate. Milestone 2B safe draft editing is now the only authorized work package. | The canonical endpoint returned `200`, release `m2a-guided-foundation-v1`, and capability `guided-flow-read`; the canonical root redirected to `www` as known hosting behavior. Deployed admin and client flow reads both returned sanitized `401` responses without a session. Authenticated browser verification used local sessions against production Supabase because a production UI credential remains unavailable; signed-scope tests cover tenant isolation. Rollback is code-only by reverting `470a338`; no schema or live flow data changed, and every Guided mutation plus provider sending remains disabled. |
| 2026-07-18 | Implemented the first Milestone 2B slice as a vertical master-detail Guided editor shared by admin and client. Safe canonical fields now edit in place; choices name their destinations; validation updates live; dirty state, unload protection, undo/redo, retry-preserving save failure handling, and authorized Save draft are connected. Step creation, duplication, reorder, deletion/repair, media replacement, server conflict handling, publish, and Canvas remain visible `Future` work. | Real-data browser verification loaded the same 8-step draft in admin and client at `1280x720` with no document overflow. An admin title edit passed undo, redo, authorized Supabase save, reload persistence, and exact restoration to `Start`; the second reload confirmed no QA marker remained. Canonical/runtime synchronization tests reject stale visual editor state and preserve stable IDs/option keys. Typecheck, scoped ESLint, `96/96` main tests, `15/15` WhatsApp reliability tests, production build, and diff checks pass. The release marker is `m2b-guided-editor-v1`; canonical deployment, denied API probes, mobile browser acceptance, conflict handling, and referenced-step repair remain open, so 2B is not complete. |
| 2026-07-18 | Released the first Milestone 2B slice from exact commit `da3fe43`. | The canonical origin redirected to `www` as expected, then returned `200`, `X-Connect-Release: m2b-guided-editor-v1`, and capabilities `guided-flow-read` plus `guided-draft-edit`. Deployed admin and signed-client flow endpoints each returned sanitized `401` without a session. Rollback is code-only by reverting `da3fe43`; no schema changed, the real draft was restored exactly after the save proof, and published flow/runtime records were not mutated. Mobile browser acceptance, server conflict handling, and referenced-step repair remain residual 2B work; publishing and Canvas remain gated. |
| 2026-07-18 | Made the Guided editor route-aware after production usability feedback showed that numbered steps and a name-only summary did not explain conversation order or branching. The left conversation path now exposes every saved choice or automatic continuation as `source label -> numbered target`; valid targets open directly. The selected-step panel now states `When ... Then Step ...`, and moves before edit fields on narrow screens. | The view derives exclusively from the existing canonical options and edges, so no second flow format or data migration was introduced. Architecture assertions cover route labels, destination language, terminal steps, and the absence of the old horizontal strip. Typecheck, scoped ESLint, `96/96` main tests, `15/15` WhatsApp reliability tests, production build, and diff checks pass. Release marker `m2b-guided-routing-v1` and authenticated production visual acceptance remain pending. |
| 2026-07-18 | Released the route-aware Guided navigation from exact commit `fe7efdd`. | The canonical origin redirected to `www` as expected, then returned `200` with `X-Connect-Release: m2b-guided-routing-v1`; deployed admin and signed-client flow endpoints each remained sanitized `401` without a session. Rollback is code-only by reverting `fe7efdd`; no schema, flow document, draft, or published runtime data changed. Authenticated production visual acceptance remains open, while step deletion repair and server conflict handling remain the next authorized 2B backend work. |
| 2026-07-18 | Replaced Guided's primary route-list workspace with the approved deterministic visual conversation tree. Start, reply paths, child steps, continuations, returns, invalid overflow, and unconnected saved steps are visible; Edit selects the card and opens the real controls in the Selected step tab. The tree exposes no more than three WhatsApp reply branches, while unsafe create/delete/reorder/media/publish mutations and Canvas remain gated. | This remains a presentation over canonical v2 and the existing authorized save adapters; no schema, draft, published flow, or runtime changed. Architecture checks cover the tree, limit-three contract, tab transition, route problems, internal horizontal containment, and absence of XYFlow/Canvas imports. Publish validation still rejects a fourth active WhatsApp button. Typecheck, scoped ESLint, `96/96` main tests, `15/15` WhatsApp reliability tests, production build, and diff checks pass. Commit `a25b5ce` reached GitHub `main`, but no Vercel check or production promotion appeared and the canonical endpoint stayed on `m2b-guided-routing-v1`; marker `m2b-guided-tree-v2` is the traceable retrigger. Boundary probes and authenticated production visual acceptance remain release gates. |
| 2026-07-18 | Released the Guided visual tree through retrigger commit `c4e4dec` after the first automatic deployment event did not promote. | The canonical origin redirected to `www` as expected and then returned `200` with `X-Connect-Release: m2b-guided-tree-v2`. Deployed admin and signed-client flow reads each returned sanitized `401` without a session. Rollback is code-only by reverting `a25b5ce` and `c4e4dec`; no schema, draft, published flow, or runtime data changed. Authenticated production visual acceptance remains open until the product owner refreshes the now-promoted build; referenced-step repair and server conflict handling remain the next 2B backend work. |
| 2026-07-19 | Implemented Milestone 2B Guided draft conflict control for admin and client saves. Draft versions now carry a monotonic revision; authorized saves atomically compare the submitted version/revision before updating and return `409 FLOW_DRAFT_CONFLICT` when another session won. The Guided workspace keeps rejected local work, blocks repeat saves, supports copying the local JSON, and requires explicit confirmation before loading the latest server draft. | Applied `wa_guided_draft_conflict_control.sql` to production Supabase after a zero-write failed parse and clean retry. Postflight found 30 version rows, one draft, two published versions, zero invalid revisions, the positive-revision constraint, intact RLS/service-role grants, two active pointers, and zero invalid pointers. A real two-tab authenticated browser test against production data proved first-save success, stale-save rejection, retained local edits, disabled save, copy feedback, cancel-safe confirmation, latest reload, and exact restoration to `Start`; reload confirmed no QA marker. The builder had no document overflow at `390px` or `1280px`. Typecheck, scoped ESLint, `99/99` main tests, `15/15` reliability tests, production build, and diff checks pass. Canonical deployment and denied production API probes remain before this slice is accepted. |
| 2026-07-19 | Released Guided draft conflict control from exact commit `c707da9`; this vertical slice is accepted while Milestone 2B remains active for step mutations, referenced-route repair, and media replacement. | The canonical origin redirected to `www` as expected and returned `200`, `X-Connect-Release: m2b-draft-conflicts-v1`, and capability `guided-draft-conflict-control`. Deployed admin and signed-client draft mutation endpoints each returned `401` without a session. The authenticated two-tab proof used local sessions against production Supabase because a production UI credential remains unavailable; this is the residual browser risk. Rollback is code-only by reverting `c707da9`; the additive revision column and constraint can remain safely because older code ignores them, and the real draft was restored to `Start` with no QA marker. The next authorized 2B slice is stable step creation/duplication/reorder/deletion with explicit referenced-route repair; publishing, Canvas, and provider sending remain gated. |
| 2026-07-19 | Implemented the next Milestone 2B vertical slice: authorized Guided drafts now support stable step creation, duplication, presentation-only reordering, and deletion with explicit incoming-route repair. Add and duplicate select the new stable node in Selected step; move controls preserve every destination ID; the start step cannot be deleted; referenced deletion requires either redirecting all inbound routes to one surviving step or removing those destinations. Choice creation/removal, broader problem coverage, and media replacement remain before the 2B gate can close. | Unit coverage proves unique stable node/edge IDs, route-preserving reorder, blocked start deletion, mandatory repair, redirect, and destination removal. An authenticated browser journey against the production draft created `step_message`, duplicated it as `step_message_copy`, reordered, saved, reloaded, deleted both, saved, and reloaded the original 8-step draft with no QA marker. A real referenced-step dialog listed `Start: choice store_info`, kept confirmation disabled until repair was selected, and cancelled without dirtying the draft. Desktop and `390x844` mobile checks found no document overflow and the add-step dialog fit the viewport. Typecheck, scoped ESLint, `103/103` main tests, `15/15` WhatsApp reliability tests, production build, and diff checks pass. No schema or published/runtime data changed. Canonical deployment and denied production mutation probes remain before this slice is accepted. |
