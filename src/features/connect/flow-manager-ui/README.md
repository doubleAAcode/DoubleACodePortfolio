# Flow Manager UI Integration

`flow-manager/` is the canonical Lovable project. The files in this directory
are a namespaced integration copy used by the main TanStack application.

## Ownership

- `components/` is mechanically copied from `flow-manager/src/components/`.
- `preview-data/` is mechanically copied from `flow-manager/src/lib/` while a
  screen still needs a backend adapter.
- `client-auth-gate.tsx` preserves the existing Vercel-backed client session.
- `preview-boundary.tsx` labels illustrative screens and blocks fake mutations.
- `feature-status.ts` is the single registry for `Future` labels. Move a route
  to the live list only after its real reads, mutations, permissions, and tests
  are complete.
- `tools/port-flow-manager-ui.mjs` is the only supported refresh path.

Connected routes are promoted from generated files and listed in the port tool
so later refreshes do not overwrite their adapters. Currently promoted:

- `src/routes/connect/client/automations.tsx`

Do not hand-redesign generated routes or presentation components. Connect real
data and actions through server adapters, hooks, and explicit component props.
When Lovable changes the source project, refresh the integration with:

```powershell
node tools/port-flow-manager-ui.mjs
```

Then run typecheck, tests, the production build, and responsive browser checks.
