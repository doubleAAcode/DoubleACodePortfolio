# Double A Connect Product Roadmap

Last updated: 2026-07-16

## Purpose

This file is the living source of truth for what Double A Connect currently
does, what the Flow Manager UI represents, and what must be built next. Update
it whenever a Connect capability is implemented, changed, verified, deferred,
or removed from scope.

The historical `.agents/ChatBot Plan.md` contains the original milestone-by-
milestone brainstorming. It remains useful background, but this file is the
current product roadmap.

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
- [x] Automated Connect suite: 39 tests passing on 2026-07-16.

### Working but temporary or incomplete product layers

- [~] Current admin functionality now runs inside the shared Connect shell;
  individual legacy screens still need to migrate to the target visual system.
- [~] `/connect/client` now has an authenticated shared shell and live home
  summary; catalog, order, and settings tools still bridge to the legacy
  dashboard during migration.
- [~] Client access still uses temporary environment-based credentials tied to
  configured businesses.
- [~] Customer profiles are derived from completed checkout data; there is no
  complete contact-management domain yet.
- [~] Message events provide an audit trail, but there is no durable support
  inbox with conversation lifecycle, assignment, notes, tags, or human outbox.
- [~] Client Automations now uses a Flow Manager-native light workspace and
  canonical editor with Guided, Canvas, Selected Step, Preview, Validation, and
  Advanced views. It loads the authorized business's real flow and templates,
  supports real visual edits and media upload, tracks unsaved changes, saves a
  draft, and publishes immutable versions. General workflow nodes, controlled
  simulation, execution traces, and granular roles remain incomplete.
- [x] The main project dependency install includes `@xyflow/react`; production
  build and typecheck pass locally.

### Flow Manager UI prototype

- [x] A separate Lovable-generated UI reference exists in `flow-manager/`.
- [x] It contains admin, client, flow-builder, inbox, contact, analytics,
  template, settings, and future-product screen designs.
- [~] Its shell and client Automations destination are being migrated into the
  main application; most prototype route screens are still not connected to a
  real route-level backend.
- [ ] Mock imports, hardcoded values, local state, and fake success toasts must
  be removed or explicitly contained inside Future Work previews.
- [ ] Its nested app shell, route tree, styles, and duplicate project setup must
  not replace the main application's root configuration.

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

## Delivery Roadmap

### Phase 0 - Preserve and verify the foundation

- [x] Audit the existing Connect backend and Flow Manager prototype.
- [x] Confirm the WhatsApp-only product direction.
- [x] Confirm deterministic flows and protected order actions.
- [x] Confirm incoming transcription and prerecorded audio scope.
- [x] Confirm clickable Future Work previews.
- [x] Create this living roadmap and workspace update rule.
- [x] Synchronize installed dependencies and restore a clean typecheck.
- [x] Keep the existing 37-test Connect suite green during migration.

Completion gate: current functionality has a reproducible green baseline and
the new UI can be introduced without deleting working behavior.

### Phase 1 - Integrate the Flow Manager shell

- [x] Add centralized feature status: `live`, `building`, and `future`.
- [x] Add shared Live, Building, and Future Work page treatment.
- [x] Mount the new admin shell under `/connect/admin`.
- [x] Mount the new client shell under `/connect/client`.
- [ ] Rebase all prototype links under `/connect`.
- [x] Reuse the main UI component library and one `@xyflow/react` version.
- [x] Isolate Connect styling without replacing the public website styles.
- [ ] Preserve temporary redirects for legacy admin and dashboard URLs.
- [x] Keep future screens clickable, illustrative, and mutation-free.

Completion gate: both new shells run in the main app, route correctly, preserve
authentication boundaries, and do not regress the public portfolio.

### Phase 2 - Real identity, tenancy, and permissions

- [ ] Replace environment-only client credentials with database-backed users.
- [ ] Implement secure login, logout, session rotation, and expiry.
- [ ] Enforce workspace membership on every client API.
- [ ] Implement owner, manager, staff/agent, and read-only permissions.
- [ ] Add invitations, activation, removal, and audit events.
- [ ] Make workspace switching real and tenant-safe.
- [ ] Retain separate internal Double A admin authorization.

Completion gate: users can access only authorized businesses and every server
mutation enforces permissions independently of the UI.

### Phase 3 - Durable messaging and WhatsApp inbox

- [ ] Add conversation records separate from runtime flow sessions.
- [ ] Add durable inbound and outbound message records and status updates.
- [ ] Add an idempotent outbound outbox with retries and failure visibility.
- [ ] Add open, pending, snoozed, closed, and reopened lifecycle behavior.
- [ ] Add assignment, transfer, notes, tags, unread state, and SLA timestamps.
- [ ] Add human replies for text, image, document, template, and audio.
- [ ] Add WhatsApp customer-window and template enforcement.
- [ ] Connect admin Live Operations and client Inbox to real data.
- [ ] Add conversation search and customer history.

Completion gate: a customer message can be received, processed by a flow,
handed to a human, replied to, delivered, and audited end to end.

### Phase 4 - Workflow-grade visual builder

- [~] Client Automations now edits the canonical versioned document through a
  Flow Manager-native editor; remaining admin and client Flow Manager screens
  still need the same service-level migration.
- [ ] Implement real trigger configuration.
- [ ] Implement text, image, template, question, menu, and handoff nodes.
- [ ] Implement typed answer storage and deterministic branches.
- [ ] Implement contact-field and tag actions.
- [ ] Implement assignment, open, close, wait, jump, and subflow nodes.
- [~] Existing protected catalog, cart, checkout, and order actions are exposed
  in the migrated client editor; the broader general workflow palette remains.
- [~] Canonical validation and server-side publishing prevent invalid commerce
  paths in the migrated slice; every new node type still needs equivalent tests.
- [~] Draft save, validation, and publishing are connected; controlled runtime
  simulation still needs to move into the client builder.
- [~] Live and draft versions are visible; add reliable unsaved-change state and
  navigation protection.
- [ ] Add per-contact execution traces and stop/restart controls.
- [ ] Add admin and client permissions for templates and business flows.
- [ ] Extend automated tests for every node and protected transition.

Completion gate: an authorized user can visually build, validate, test,
publish, execute, and diagnose a real WhatsApp workflow.

### Phase 5 - Media library and voice-note transcription

- [ ] Add tenant-owned media assets and retention rules.
- [ ] Add upload validation and secure media access.
- [ ] Add outbound prerecorded-audio sender support and delivery logs.
- [ ] Add a prerecorded-audio flow node.
- [ ] Add secure inbound WhatsApp audio download.
- [ ] Add transcription jobs, retry handling, and cost/usage records.
- [ ] Feed usable transcripts into the active deterministic flow.
- [ ] Add explicit fallback behavior for failed or low-quality transcription.
- [ ] Show original audio and transcript together in the inbox.

Completion gate: prerecorded audio can be sent by a real flow, and a real
customer voice note can be transcribed and continue that flow safely.

### Phase 6 - Complete admin and client operations

- [ ] Connect real admin overview and business onboarding to the new UI.
- [ ] Connect WhatsApp connection setup and health.
- [ ] Connect catalog, variants, stock, fulfillment, and settings.
- [ ] Connect client order list, details, decisions, and lifecycle actions.
- [ ] Connect owner notifications and reminders.
- [ ] Expand customer profiles into managed contacts with consent and history.
- [ ] Connect logs, diagnostics, and practical operational analytics.
- [ ] Remove superseded legacy UI only after parity is verified.

Completion gate: every currently working legacy workflow is available through
the new UI with equal or better behavior.

### Phase 7 - WhatsApp templates and broadcasts

- [ ] Add client-authorized WhatsApp template listing and submission.
- [ ] Track template status, language, category, quality, and rejection reason.
- [ ] Add contact consent and opt-in evidence.
- [ ] Add audience segments and recipient snapshots.
- [ ] Add draft, schedule, cancel, send, retry, and completion states.
- [ ] Add rate-aware background delivery and per-recipient outcomes.
- [ ] Add broadcast cost and delivery/read/reply reporting where available.
- [ ] Prevent broadcasts without approved templates and valid consent.

Completion gate: an authorized client can safely send and audit a compliant
WhatsApp template broadcast to a consented audience.

### Phase 8 - Production hardening and launch readiness

- [ ] Add full role and tenant-isolation integration tests.
- [ ] Add workflow migration and backward-compatibility tests.
- [ ] Add message-outbox, scheduler, transcription, and broadcast load tests.
- [ ] Add structured observability, alerting, and operator runbooks.
- [ ] Define backup, restore, retention, deletion, and incident procedures.
- [ ] Add abuse controls, rate limits, secret rotation, and security review.
- [ ] Complete accessibility and responsive visual verification.
- [ ] Complete Meta production review evidence and operational QA.

Completion gate: production behavior is observable, recoverable, secure, and
verified with real WhatsApp test accounts.

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

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-07-16 | Flow Manager is the target UI, not a second deployed app. | The main app already owns working routes, APIs, auth, Supabase, and deployment. |
| 2026-07-16 | Current product scope is WhatsApp only. | Focus engineering on a complete messaging and workflow product. |
| 2026-07-16 | AI agents are deferred. | Deterministic flow reliability and operations come first. |
| 2026-07-16 | Audio means prerecorded outbound responses plus inbound transcription. | No generated voice or AI phone calls are required. |
| 2026-07-16 | Future features stay clickable as labeled previews. | Keep the product vision visible without claiming fake functionality. |
| 2026-07-16 | Order behavior uses protected backend actions with constrained admin configuration. | Preserve price, inventory, idempotency, and order-state integrity. |
| 2026-07-16 | Target workflow quality is respond.io-grade for WhatsApp, not omnichannel parity. | Build strong triggers, steps, branches, operations, testing, and execution history around WhatsApp. |
| 2026-07-16 | New Connect routes reuse the legacy server-side Vercel environment contract. | Preserve deployed dashboard, Supabase, and WhatsApp configuration without exposing secrets to the browser or creating a second configuration system. |
| 2026-07-16 | Flow Manager owns the new UI; legacy route components cannot be embedded in it. | Reuse proven backend behavior without creating a visually inconsistent hybrid product. |

## Roadmap Changelog

| Date | Change | Verification |
| --- | --- | --- |
| 2026-07-16 | Created the living roadmap from the existing implementation audit and product-scope decisions. | Existing Connect suite: 37 tests passed. Current typecheck blocked by missing local `@xyflow/react` installation. |
| 2026-07-16 | Synchronized dependencies; added the shared Connect feature registry, status treatments, admin/client shells, authenticated client home, legacy tool bridges, and clickable Future Work previews; repaired `/connect` route nesting so child workspaces render. | Production build passed; typecheck passed; 37 tests passed; `/connect`, `/connect/client`, and `/connect/admin` verified in desktop and 390px mobile browser layouts with no current console errors. |
| 2026-07-16 | Connected client Automations to business-scoped canonical flow APIs using the existing `WA_DASHBOARD_*`, Supabase, and WhatsApp Vercel contracts; added real template cloning, visual editing, image upload, draft save, checkout-setting save, validation, version display, and publishing. Expanded `.env.example` with the legacy primary, partner, and internal-admin variable names. | Production build passed; typecheck passed; 38 tests passed; scoped ESLint passed, including a tenant-authorization regression test. |
| 2026-07-16 | Corrected the UI migration boundary: removed the embedded legacy admin editor from the client route, restored legacy admin media handling to its own route, ported the Flow Manager light workspace theme and navigation, and added a Flow Manager-native canonical editor with real data and mutations. | Production build, typecheck, and scoped ESLint passed; 39 tests passed, including a regression test forbidding legacy editor and mock-data imports in the client Flow Manager; login verified at desktop and 390px mobile with no overflow or browser errors. |
