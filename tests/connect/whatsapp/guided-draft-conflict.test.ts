import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertExpectedDraftRevision,
  FlowDraftConflictError,
} from "../../../src/features/connect/shared/flow-draft-conflict.ts";

test("matching Guided draft identity and revision may proceed", () => {
  assert.doesNotThrow(() =>
    assertExpectedDraftRevision({
      draftId: "flow-v2",
      draftRevision: 4,
      expectedVersionId: "flow-v2",
      expectedRevision: 4,
    }),
  );
});

test("stale, replaced, missing, and invalid draft revisions conflict", () => {
  const attempts = [
    { draftId: "flow-v2", draftRevision: 5, expectedVersionId: "flow-v2", expectedRevision: 4 },
    { draftId: "flow-v3", draftRevision: 1, expectedVersionId: "flow-v2", expectedRevision: 1 },
    {
      draftId: undefined,
      draftRevision: undefined,
      expectedVersionId: "flow-v2",
      expectedRevision: 1,
    },
    { draftId: "flow-v2", draftRevision: 1, expectedVersionId: "flow-v2", expectedRevision: 0 },
  ];

  for (const attempt of attempts) {
    assert.throws(() => assertExpectedDraftRevision(attempt), FlowDraftConflictError);
  }
});

test("draft persistence uses an atomic revision guard and returns a recoverable 409", async () => {
  const [store, adminHandlers, dashboardHandlers, workspace, migration] = await Promise.all([
    readFile("src/features/connect/shared/flow-template-store.server.ts", "utf8"),
    readFile("src/features/connect/shared/admin-api-handlers.server.ts", "utf8"),
    readFile("src/features/connect/shared/dashboard-api-handlers.server.ts", "utf8"),
    readFile("src/features/connect/flow-manager-ui/guided-flow-workspace.tsx", "utf8"),
    readFile("supabase/connect/wa_guided_draft_conflict_control.sql", "utf8"),
  ]);

  assert.match(store, /status=eq\.DRAFT&revision=eq\.\$\{expectedRevision\}/);
  assert.match(store, /revision: draft \? draft\.revision \+ 1 : 1/);
  assert.match(adminHandlers, /FlowDraftConflictError[\s\S]*status: 409/);
  assert.match(dashboardHandlers, /FlowDraftConflictError[\s\S]*status: 409/);
  assert.match(workspace, /expectedRevision: model\.version\.revision/);
  assert.match(workspace, /Your save was rejected and your local edits remain open/);
  assert.match(workspace, /Copy local draft/);
  assert.match(workspace, /Discard local unsaved edits\?/);
  assert.match(migration, /add column if not exists revision bigint/);
  assert.match(migration, /alter column revision set not null/);
  assert.match(migration, /wa_business_flow_versions_revision_positive/);
});
