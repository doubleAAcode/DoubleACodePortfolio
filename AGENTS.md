# Workspace Instructions

## Connect roadmap

`plan.md` at the repository root is the living source of truth for the Double A
Connect product. Read it before making changes under any of these paths:

- `src/features/connect/`
- `src/routes/connect*`
- `src/routes/api.connect*`
- `supabase/connect/`
- `tests/connect/`
- `docs/connect/`
- `flow-manager/`

Whenever an implementation changes the actual status, scope, behavior, or
verification of a Connect capability, update `plan.md` in the same change.

Roadmap update rules:

1. Mark a capability complete only when its real UI, backend, authorization,
   persistence, error handling, and proportionate tests are connected.
2. A Lovable screen, mock dataset, local-only state, or success toast is not an
   implemented capability.
3. Use `In progress` for partial vertical slices and describe what is still
   missing. Do not mark the whole feature complete.
4. Record relevant tests or verification in the roadmap changelog.
5. Keep deferred product ideas visible under Future Work. Do not delete them
   merely because they are out of the current phase.
6. Future-work routes remain clickable UI previews. They must display a clear
   `Future work` notice, must identify illustrative data, and must not perform
   real mutations or show fake success results.
7. Preserve the protected backend order engine. Admin customization may change
   conversation copy and supported business policies, but never pricing,
   inventory, idempotency, tenant isolation, or order-state invariants.
8. Add material product decisions to the decision log in `plan.md`.
9. Treat `flow-manager/` as the target Connect presentation and interaction
   system. New `/connect/admin` and `/connect/client` screens may reuse legacy
   services, schemas, authorization, and domain helpers, but must not import,
   embed, or cosmetically wrap legacy route/page components.
10. Treat the checked-out `flow-manager/` route and component tree as the
    canonical UI baseline. Use `tools/port-flow-manager-ui.mjs` to refresh the
    namespaced copy, and connect real data and actions through adapters without
    redesigning or replacing the cloned screen composition unless a product
    decision is recorded in `plan.md`.
11. Consult `docs/connect/flow-manager-backend-map.md` before connecting a
    Flow Manager screen. Extend an existing `wa_*` domain when one is already
    authoritative, keep new schemas additive and tenant-scoped, and route all
    browser access through authenticated server adapters rather than exposing
    Supabase service-role credentials or direct table access.
12. Work only from the active milestone and work-package sequence in `plan.md`.
    Do not begin a queued milestone merely because one of its screens or backend
    helpers is easy to connect.
13. Apply the roadmap Definition of Ready before implementation and its full
    verification ladder before marking work complete. A local test pass does not
    replace deployed database, browser, authorization, or real-provider evidence
    when those gates apply.
14. Record release evidence, residual risk, rollback readiness, and the next
    authorized work package in the Roadmap Changelog. Do not promote the next
    milestone until the current completion gate is accepted.
15. Use `https://doubleacode.com` as the canonical production origin for
    deployed Connect browser, API, webhook, and release verification. A redirect
    to `https://www.doubleacode.com` may be observed as hosting behavior, but do
    not substitute localhost, a preview URL, or another hostname for production
    acceptance evidence.

`.agents/ChatBot Plan.md` is historical milestone and brainstorming context.
Do not treat it as the current roadmap when it conflicts with `plan.md`.
