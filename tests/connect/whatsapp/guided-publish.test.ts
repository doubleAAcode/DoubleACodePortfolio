import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  cloneTemplateToBusiness,
  ensureDefaultFlowTemplates,
  publishBusinessFlowVersion,
  saveBusinessFlowDraft,
} from "../../../src/features/connect/shared/flow-template-store.server.ts";

test("publishing a Guided draft creates a new active immutable snapshot and keeps the draft editable", async () => {
  const businessId = `guided-publish-${Date.now()}`;
  await ensureDefaultFlowTemplates("publish-test");
  const seeded = await cloneTemplateToBusiness({
    businessId,
    templateId: "greeting_store_info",
    adminUser: "publish-test",
    publish: true,
  });
  const firstLive = seeded.activeVersion;
  assert.ok(firstLive);

  const draftDetails = await saveBusinessFlowDraft({
    businessId,
    flowJson: { ...firstLive.flow_json, name: "Publishable Guided draft" },
    adminUser: "publish-editor",
  });
  const draft = draftDetails.versions.find((version) => version.status === "DRAFT");
  assert.ok(draft);

  const published = await publishBusinessFlowVersion({
    businessId,
    versionId: draft.id,
  });
  const active = published.activeVersion;
  assert.ok(active);
  assert.notEqual(active.id, draft.id);
  assert.equal(active.status, "PUBLISHED");
  assert.equal(active.flow_json.name, "Publishable Guided draft");
  assert.equal(published.flow?.active_version_id, active.id);
  assert.equal(
    published.versions.find((version) => version.id === firstLive.id)?.status,
    "ARCHIVED",
  );
  assert.equal(published.versions.find((version) => version.id === draft.id)?.status, "DRAFT");

  const editedAfterPublish = await saveBusinessFlowDraft({
    businessId,
    flowJson: { ...draft.flow_json, name: "Next editable draft" },
    adminUser: "publish-editor",
    versionId: draft.id,
    expectedRevision: draft.revision,
  });
  assert.equal(editedAfterPublish.activeVersion?.id, active.id);
  assert.equal(
    editedAfterPublish.versions.find((version) => version.id === active.id)?.flow_json.name,
    "Publishable Guided draft",
  );
});

test("Guided publish is connected for admin and client with blocker and pinning copy", async () => {
  const [workspace, adminRoute, clientRoute, adminHandlers, dashboardHandlers, boundary] =
    await Promise.all([
      readFile("src/features/connect/flow-manager-ui/guided-flow-workspace.tsx", "utf8"),
      readFile("src/routes/connect.admin.businesses.$id.flow-builder.tsx", "utf8"),
      readFile("src/routes/connect/client/automations.tsx", "utf8"),
      readFile("src/features/connect/shared/admin-api-handlers.server.ts", "utf8"),
      readFile("src/features/connect/shared/dashboard-api-handlers.server.ts", "utf8"),
      readFile("src/features/connect/flow-manager-ui/preview-boundary.tsx", "utf8"),
    ]);

  assert.match(workspace, /onPublishVersion/);
  assert.match(workspace, /Save the draft before publishing/);
  assert.match(workspace, /Fix publish blockers first/);
  assert.match(workspace, /Existing chats\s+keep the version they already started with/);
  assert.match(workspace, /open=\{publishDialogOpen\}/);
  assert.match(workspace, /Publishing and refreshing the live flow/);
  assert.match(workspace, /border-slate-200 bg-white text-slate-950/);
  assert.match(workspace, /bg-blue-600 text-white/);
  assert.match(workspace, /role="status"/);
  assert.match(workspace, /Saving draft\.\.\./);
  assert.match(workspace, /Publish flow/);
  assert.doesNotMatch(workspace, /Publish <FutureLabel/);
  assert.match(adminRoute, /action: "publish_business_flow"/);
  assert.match(clientRoute, /action: "publish_version"/);
  assert.match(adminHandlers, /BUSINESS_FLOW_PUBLISHED/);
  assert.match(
    dashboardHandlers,
    /publishBusinessFlowVersion\(\{\s*businessId: session\.businessId/,
  );
  assert.match(boundary, /Save draft, and Publish are connected/);
});
