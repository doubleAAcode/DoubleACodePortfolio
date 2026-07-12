# WhatsApp Flow Architecture

Phase 1 introduces a compatibility period for the WhatsApp flow system.

## Canonical model

`CanonicalFlowDocument` schema version `2` is the intended source of truth for runtime flow
semantics. Runtime behavior is represented by:

- `startNodeId`
- `nodes`
- `edges`

Editor-only data such as canvas positions and viewport belongs under `editorMetadata` and must not
change runtime execution.

## Compatibility period

The application still stores and reads existing `FlowDefinition` and `VisualFlowDefinition` payloads
while the builder and runtime are migrated. All supported legacy documents must pass through explicit
adapters before validation or runtime decisions are made.

Current compatibility adapters live in `src/lib/whatsapp/flow-document.ts`:

- `loadCanonicalFlowDocument`
- `convertLegacyVisualFlowToCanonical`
- `convertLegacyRuntimeFlowToCanonical`
- `canonicalFlowToRuntimeFlow`

## Temporary legacy models

These models remain during the transition:

- `VisualFlowDefinition`
- `FlowDefinition`
- legacy editor fields under `flow.editor`
- legacy bot flow settings used by the deterministic commerce engine

They should be treated as compatibility layers, not as new sources of truth.

## Validation

Canonical validation lives in `src/lib/whatsapp/flow-validation.ts` and has explicit modes:

- `save`: structural blockers only
- `draft`: structural blockers plus non-blocking editor warnings
- `publish`: strict runtime/publish rules

Draft saving may persist incomplete work. Publishing remains strict.

## Runtime direction

Runtime selection should depend on the loaded flow document/version, not graph layout heuristics such
as whether a flow has edges. Sessions pin the flow version they started with so a new publish does not
change an active conversation.

The deterministic commerce engine remains protected. Future phases should move runtime execution to
node handlers while keeping commerce actions as protected adapters.
