import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  cloneTemplateToBusiness,
  ensureDefaultFlowTemplates,
  FlowVersionActionError,
  restoreBusinessFlowVersionToDraft,
  saveBusinessFlowDraft,
} from "../../../src/features/connect/shared/flow-template-store.server.ts";

test("restoring history creates a new editable draft without changing the live snapshot", async () => {
  const businessId = `history-restore-${Date.now()}`;
  await ensureDefaultFlowTemplates("history-test");
  const published = await cloneTemplateToBusiness({
    businessId,
    templateId: "greeting_store_info",
    adminUser: "history-test",
    publish: true,
  });
  const liveVersion = published.activeVersion;
  assert.ok(liveVersion);

  const withDraft = await saveBusinessFlowDraft({
    businessId,
    flowJson: { ...liveVersion.flow_json, name: "Current draft before restore" },
    adminUser: "history-test",
  });
  const replacedDraft = withDraft.versions.find((version) => version.status === "DRAFT");
  assert.ok(replacedDraft);

  const restored = await restoreBusinessFlowVersionToDraft({
    businessId,
    versionId: liveVersion.id,
    adminUser: "history-restorer",
  });
  const restoredDraft = restored.versions.find((version) => version.status === "DRAFT");
  assert.ok(restoredDraft);
  assert.notEqual(restoredDraft.id, liveVersion.id);
  assert.notEqual(restoredDraft.id, replacedDraft.id);
  assert.equal(restoredDraft.revision, 1);
  assert.equal(restoredDraft.created_by_user_id, "history-restorer");
  assert.deepEqual(restoredDraft.flow_json, liveVersion.flow_json);
  assert.equal(
    restored.versions.find((version) => version.id === replacedDraft.id)?.status,
    "ARCHIVED",
  );
  assert.equal(restored.activeVersion?.id, liveVersion.id);
  assert.equal(restored.flow?.active_version_id, liveVersion.id);
  assert.equal(
    restored.versions.find((version) => version.id === liveVersion.id)?.status,
    "PUBLISHED",
  );

  const edited = await saveBusinessFlowDraft({
    businessId,
    flowJson: { ...restoredDraft.flow_json, name: "Editable restored draft" },
    adminUser: "history-editor",
    versionId: restoredDraft.id,
    expectedRevision: restoredDraft.revision,
  });
  assert.equal(
    edited.versions.find((version) => version.status === "DRAFT")?.flow_json.name,
    "Editable restored draft",
  );
  assert.deepEqual(
    edited.versions.find((version) => version.id === liveVersion.id)?.flow_json,
    liveVersion.flow_json,
  );
  assert.equal(edited.activeVersion?.id, liveVersion.id);

  await assert.rejects(
    restoreBusinessFlowVersionToDraft({
      businessId,
      versionId: edited.versions.find((version) => version.status === "DRAFT")!.id,
      adminUser: "history-test",
    }),
    (error: unknown) =>
      error instanceof FlowVersionActionError &&
      error.code === "FLOW_VERSION_NOT_RESTORABLE" &&
      error.status === 409,
  );
  await assert.rejects(
    restoreBusinessFlowVersionToDraft({
      businessId: `${businessId}-other-tenant`,
      versionId: liveVersion.id,
      adminUser: "history-test",
    }),
    (error: unknown) =>
      error instanceof FlowVersionActionError &&
      error.code === "FLOW_VERSION_NOT_FOUND" &&
      error.status === 404,
  );
});

test("restore uses one service-role-only database command and both authorized Guided adapters", async () => {
  const [migration, store, adminHandlers, dashboardHandlers, workspace, adminRoute, clientRoute] =
    await Promise.all([
      readFile("supabase/connect/wa_restore_business_flow_version.sql", "utf8"),
      readFile("src/features/connect/shared/flow-template-store.server.ts", "utf8"),
      readFile("src/features/connect/shared/admin-api-handlers.server.ts", "utf8"),
      readFile("src/features/connect/shared/dashboard-api-handlers.server.ts", "utf8"),
      readFile("src/features/connect/flow-manager-ui/guided-flow-workspace.tsx", "utf8"),
      readFile("src/routes/connect.admin.businesses.$id.flow-builder.tsx", "utf8"),
      readFile("src/routes/connect/client/automations.tsx", "utf8"),
    ]);

  assert.match(migration, /where business_id = p_business_id[\s\S]*for update/);
  assert.match(migration, /id = p_source_version_id[\s\S]*business_flow_id = v_flow\.id/);
  assert.match(migration, /set status = 'ARCHIVED'[\s\S]*status = 'DRAFT'/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated/);
  assert.match(store, /restoreBusinessFlowVersionToDraft/);
  assert.match(store, /\/rpc\/wa_restore_business_flow_version/);
  assert.match(adminHandlers, /restore_business_flow_version/);
  assert.match(adminHandlers, /BUSINESS_FLOW_VERSION_RESTORED/);
  assert.match(dashboardHandlers, /action: "restore_version"/);
  assert.match(workspace, /Restore as draft/);
  assert.match(workspace, /The live version has not changed\./);
  assert.match(workspace, /The live version stays unchanged until/);
  assert.match(workspace, /Publish <FutureLabel/);
  assert.match(adminRoute, /action: "restore_business_flow_version"/);
  assert.match(clientRoute, /action: "restore_version"/);
});
