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

`.agents/ChatBot Plan.md` is historical milestone and brainstorming context.
Do not treat it as the current roadmap when it conflicts with `plan.md`.
