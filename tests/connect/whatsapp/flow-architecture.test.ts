import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  CANONICAL_FLOW_SCHEMA_VERSION,
  canonicalFlowToRuntimeFlow,
  convertLegacyVisualFlowToCanonical,
  convertLegacyRuntimeFlowToCanonical,
  loadCanonicalFlowDocument,
  withCanonicalFlowDocument,
  type CanonicalFlowDocument,
} from "../../../src/features/connect/shared/flow-document.ts";
import {
  flowDiagnosticsToLegacyResult,
  validateFlow,
} from "../../../src/features/connect/shared/flow-validation.ts";
import {
  createDefaultFlowDefinition,
  type FlowDefinition,
} from "../../../src/features/connect/shared/flow-template-types.ts";
import {
  compileVisualFlowToRuntimeFlow,
  createVisualFlowFromRuntime,
  type VisualFlowDefinition,
} from "../../../src/features/connect/shared/visual-flow-builder.ts";

test("loads canonical v2 documents and rejects unknown versions", () => {
  const document = canonicalOneMessageDocument("hello", "Hello");
  const loaded = loadCanonicalFlowDocument(document);

  assert.equal(loaded.ok, true);
  if (loaded.ok) {
    assert.equal(loaded.source, "canonical_v2");
    assert.equal(loaded.document.schemaVersion, CANONICAL_FLOW_SCHEMA_VERSION);
  }

  const unsupported = loadCanonicalFlowDocument({ ...document, schemaVersion: 99 });
  assert.equal(unsupported.ok, false);
  if (!unsupported.ok) {
    assert.equal(unsupported.diagnostics[0]?.code, "UNSUPPORTED_SCHEMA_VERSION");
  }
});

test("converts legacy runtime and visual documents while preserving ids and editor metadata", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const runtimeDocument = convertLegacyRuntimeFlowToCanonical(flow);
  const visual = createVisualFlowFromRuntime(flow);
  const visualDocument = loadCanonicalFlowDocument(visual);

  assert.equal(runtimeDocument.startNodeId, "start");
  assert.equal(
    runtimeDocument.nodes.some((node) => node.id === "main_menu"),
    true,
  );
  assert.equal(visualDocument.ok, true);
  if (visualDocument.ok) {
    assert.equal(
      visualDocument.document.nodes.some((node) => node.id === "main_menu"),
      true,
    );
    assert.ok(visualDocument.document.editorMetadata?.positions?.start);
  }
});

test("draft validation warns without blocking structurally valid incomplete work", () => {
  const document: CanonicalFlowDocument = {
    schemaVersion: 2,
    startNodeId: null,
    nodes: [{ id: "message_1", type: "MESSAGE", messages: { en: "" } }],
    edges: [],
  };

  const save = validateFlow(document, { mode: "save" });
  const draft = validateFlow(document, { mode: "draft" });
  const publish = validateFlow(document, { mode: "publish" });

  assert.equal(save.ok, true);
  assert.equal(draft.ok, true);
  assert.equal(
    draft.diagnostics.some((diagnostic) => diagnostic.severity === "warning"),
    true,
  );
  assert.equal(publish.ok, false);
});

test("publish validation enforces WhatsApp option limits and rejects condition nodes", () => {
  const tooManyOptions = canonicalChoiceDocument("menu", [
    ["one", "One"],
    ["two", "Two"],
    ["three", "Three"],
    ["four", "Four"],
  ]);
  const conditionFlow: CanonicalFlowDocument = {
    schemaVersion: 2,
    startNodeId: "condition_1",
    nodes: [{ id: "condition_1", type: "CONDITION", config: { conditionSource: "x" } }],
    edges: [],
  };

  const optionValidation = validateFlow(tooManyOptions, { mode: "publish" });
  const conditionValidation = validateFlow(conditionFlow, { mode: "publish" });

  assert.equal(optionValidation.ok, false);
  assert.equal(
    optionValidation.diagnostics.some(
      (diagnostic) => diagnostic.code === "PUBLISH_WHATSAPP_BUTTON_LIMIT",
    ),
    true,
  );
  assert.equal(conditionValidation.ok, false);
  assert.equal(
    conditionValidation.diagnostics.some(
      (diagnostic) => diagnostic.code === "CONDITION_UNSUPPORTED_FOR_PUBLISH",
    ),
    true,
  );
});

test("message option blocks preserve active options and pass save, draft, and publish validation", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const visual = messageOptionsVisualFlow({ optionActive: true });
  const canonical = convertLegacyVisualFlowToCanonical(visual, flow);
  const menuNode = canonical.nodes.find((node) => node.id === "message_welcome");

  assert.equal(menuNode?.type, "MAIN_MENU");
  assert.equal(menuNode?.title, "Message Welcome");
  assert.equal(menuNode?.options?.[0]?.key, "Human support");
  assert.equal(menuNode?.options?.[0]?.label.en, "I need Support");
  assert.equal(menuNode?.options?.[0]?.label.ar, "\u062e\u064a\u0627\u0631");
  assert.equal(menuNode?.options?.[0]?.active, true);
  assert.equal(menuNode?.options?.[0]?.targetNodeId, "talk_to_human");
  assert.equal(menuNode?.options?.[0]?.sortOrder, 1);

  const save = validateFlow(canonical, { mode: "save" });
  const draft = validateFlow(canonical, { mode: "draft" });
  const publish = validateFlow(canonical, { mode: "publish" });

  assert.equal(save.ok, true);
  assert.equal(
    draft.diagnostics.some((diagnostic) => diagnostic.code === "CHOICE_OPTIONS_MISSING"),
    false,
  );
  assert.equal(
    publish.diagnostics.some((diagnostic) => diagnostic.code === "PUBLISH_CHOICE_OPTIONS_MISSING"),
    false,
  );
});

test("inactive message options warn in draft, fail in publish, and name the visual node", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const canonical = convertLegacyVisualFlowToCanonical(
    messageOptionsVisualFlow({ optionActive: false }),
    flow,
  );

  const draft = validateFlow(canonical, { mode: "draft" });
  const publish = validateFlow(canonical, { mode: "publish" });
  const draftIssue = draft.diagnostics.find(
    (diagnostic) => diagnostic.code === "CHOICE_OPTIONS_MISSING",
  );
  const publishIssue = publish.diagnostics.find(
    (diagnostic) => diagnostic.code === "PUBLISH_CHOICE_OPTIONS_MISSING",
  );
  const legacyPublishIssue = flowDiagnosticsToLegacyResult(publish.diagnostics).issues.find(
    (issue) => issue.code === "PUBLISH_CHOICE_OPTIONS_MISSING",
  );

  assert.equal(draft.ok, true);
  assert.equal(draftIssue?.severity, "warning");
  assert.equal(draftIssue?.nodeId, "message_welcome");
  assert.equal(draftIssue?.message, "Message Welcome needs at least one active option.");
  assert.equal(publish.ok, false);
  assert.equal(publishIssue?.severity, "error");
  assert.equal(publishIssue?.nodeId, "message_welcome");
  assert.equal(publishIssue?.message, "Message Welcome needs at least one active option.");
  assert.equal(legacyPublishIssue?.nodeId, "message_welcome");
});

test("message option state and targets survive canonical conversion, runtime conversion, and reload", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const visual = messageOptionsVisualFlow({ optionActive: true });
  const canonical = convertLegacyVisualFlowToCanonical(visual, flow);
  const runtime = canonicalFlowToRuntimeFlow(canonical, flow);
  const reloaded = loadCanonicalFlowDocument(JSON.parse(JSON.stringify(runtime)));

  assert.equal(
    runtime.nodes.find((node) => node.id === "message_welcome")?.options?.[0]?.active,
    true,
  );
  assert.equal(
    runtime.nodes.find((node) => node.id === "message_welcome")?.options?.[0]?.targetNodeId,
    "talk_to_human",
  );
  assert.equal(
    runtime.edges.some(
      (edge) =>
        edge.from === "message_welcome" &&
        edge.to === "talk_to_human" &&
        edge.condition === "Human support",
    ),
    true,
  );
  assert.equal(reloaded.ok, true);
  if (reloaded.ok) {
    const reloadedNode = reloaded.document.nodes.find((node) => node.id === "message_welcome");
    assert.equal(reloadedNode?.options?.[0]?.active, true);
    assert.equal(reloadedNode?.options?.[0]?.targetNodeId, "talk_to_human");
  }
});

test("submitted visual flow replaces stale persisted canonical options during validation", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const staleCanonical = convertLegacyVisualFlowToCanonical(
    messageOptionsVisualFlow({ optionActive: false }),
    flow,
  );
  const submittedFlow = {
    ...flow,
    canonicalDocument: staleCanonical,
    visualFlow: messageOptionsVisualFlow({ optionActive: true }),
  };
  const refreshed = withCanonicalFlowDocument(submittedFlow);
  const publish = validateFlow(refreshed, { mode: "publish" });

  assert.equal(
    publish.diagnostics.some((diagnostic) => diagnostic.code === "PUBLISH_CHOICE_OPTIONS_MISSING"),
    false,
  );
});

test("compiled message options use current visual options instead of empty legacy main menu data", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const visual = messageOptionsVisualFlow({ optionActive: true });
  const compiled = compileVisualFlowToRuntimeFlow(visual, {
    ...flow,
    editor: { ...flow.editor, mainMenuOptions: [] },
  });

  assert.equal(compiled.ok, true);
  assert.equal(compiled.flow?.editor?.mainMenuOptions?.length, 1);
  assert.equal(compiled.flow?.editor?.mainMenuOptions?.[0]?.key, "Human support");
  assert.equal(
    compiled.validation.issues.some(
      (issue) => issue.message === "Main menu needs at least one active option.",
    ),
    false,
  );
});

test("business flow publishing creates a new published snapshot in source", () => {
  const source = readFileSync("src/features/connect/shared/flow-template-store.server.ts", "utf8");

  assert.match(source, /const publishedVersion: BusinessFlowVersionRow =/);
  assert.match(source, /status: "PUBLISHED"/);
  assert.match(source, /active_version_id: publishedVersion\.id/);
  assert.doesNotMatch(source, /version\.status = "PUBLISHED"/);
});

test("admin template cloning backend creates a draft without replacing the live version", () => {
  const source = readFileSync("src/features/connect/shared/flow-template-store.server.ts", "utf8");

  assert.match(source, /publish = false/);
  assert.match(source, /const versionId = `\$\{flowId\}-v\$\{versionNumber\}`/);
  assert.match(source, /status: publish \? "PUBLISHED" : "DRAFT"/);
  assert.match(
    source,
    /active_version_id: publish \? null : \(?existingFlow\?\.active_version_id \?\? null\)?/,
  );
  assert.match(source, /await archiveBusinessDraftVersions\(flowId\)/);
  assert.match(source, /async function archiveBusinessDraftVersions/);
  assert.match(source, /if \(publish\) \{/);
  assert.match(source, /publish: true/);
  assert.doesNotMatch(source, /draft\?\.id \?\? `\$\{flowId\}-v\$\{versionNumber\}`/);
});

test("session runtime loading uses pinned flow versions in source", () => {
  const source = readFileSync("src/features/connect/shared/conversation-engine.server.ts", "utf8");

  assert.match(source, /getBusinessFlowVersion\(\{ businessId, versionId: session\.flowVersionId/);
  assert.match(source, /conversation\.flow_version_legacy_session_pinned/);
  assert.match(source, /conversation\.flow_version_missing/);
  assert.doesNotMatch(source, /flow\.edges\.length > 0/);
});

test("client flow API scopes every mutation to the signed dashboard business", () => {
  const handlers = readFileSync(
    "src/features/connect/shared/dashboard-api-handlers.server.ts",
    "utf8",
  );
  const client = readFileSync("src/features/connect/shared/dashboard-client.ts", "utf8");

  assert.match(handlers, /createDashboardFlowHandlers\(envSuffix = ""\)/);
  assert.match(handlers, /getDashboardSessionFromRequest\(request, envSuffix\)/);
  assert.match(handlers, /saveBusinessFlowDraft\(\{\s*businessId: session\.businessId/);
  assert.match(handlers, /publishBusinessFlowVersion\(\{\s*businessId: session\.businessId/);
  assert.match(handlers, /cloneTemplateToBusiness\(\{\s*businessId: session\.businessId/);
  assert.match(handlers, /saveWaDashboardFlowSettings\(session\.businessId, action\)/);
  assert.doesNotMatch(handlers, /body\?\.businessId/);
  assert.match(client, /dashboardApiPath\("\/flow"\)/);
});

test("Connect routes mount Flow Manager presentation without legacy UI components", () => {
  const clientLayout = readFileSync("src/routes/connect/client.tsx", "utf8");
  const adminLayout = readFileSync("src/routes/connect.admin.tsx", "utf8");
  const automations = readFileSync("src/routes/connect/client/automations.tsx", "utf8");
  const previewBoundary = readFileSync(
    "src/features/connect/flow-manager-ui/preview-boundary.tsx",
    "utf8",
  );
  const portTool = readFileSync("tools/port-flow-manager-ui.mjs", "utf8");
  const legacyDashboardProducts = readFileSync("src/routes/connect.dashboard.products.tsx", "utf8");
  const submoduleConfig = readFileSync(".gitmodules", "utf8");

  assert.match(clientLayout, /flow-manager-ui\/components\/client-sidebar/);
  assert.match(adminLayout, /flow-manager-ui\/components\/app-sidebar/);
  assert.match(automations, /flow-manager-ui\/components\/workflow-canvas/);
  assert.match(automations, /flow-manager-ui\/preview-data\/mock-client/);
  assert.match(automations, /getWaDashboardFlow/);
  assert.match(automations, /features\/connect\/shared\/dashboard-client/);
  assert.match(previewBoundary, /UI preview only\. Data is illustrative/);
  assert.match(previewBoundary, /workflow list uses the authorized business backend/);
  assert.match(portTool, /connectedClientRoutes = new Set\(\["automations\.tsx"\]\)/);
  assert.match(portTool, /connectedClientRoutes\.has\(sourceName\.slice\("client\."\.length\)\)/);
  assert.doesNotMatch(clientLayout, /ConnectWorkspaceShell|CanonicalFlowManagerEditor/);
  assert.doesNotMatch(adminLayout, /ConnectWorkspaceShell|VisualFlowBuilderEditor/);
  assert.match(legacyDashboardProducts, /redirect\(\{ href: "\/connect\/client\/catalog" \}\)/);
  assert.doesNotMatch(legacyDashboardProducts, /ProductsPage|dashboard-client/);
  assert.match(submoduleConfig, /url = https:\/\/github\.com\/Alawieh\/flow-manager\.git/);
  assert.equal(existsSync("src/features/connect/shell"), false);
  assert.equal(existsSync("src/features/connect/flow-manager"), false);
});

test("Flow Manager core schema adds tenant-scoped WhatsApp operations tables", () => {
  const schema = readFileSync("supabase/connect/wa_flow_manager_core_schema.sql", "utf8");

  for (const table of [
    "wa_contacts",
    "wa_tags",
    "wa_contact_tags",
    "wa_media_assets",
    "wa_conversations",
    "wa_conversation_messages",
    "wa_conversation_events",
    "wa_canned_replies",
  ]) {
    assert.match(schema, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(
      schema,
      new RegExp(`grant select, insert, update, delete on public\\.${table} to service_role`),
    );
  }

  assert.match(schema, /check \(channel = 'WHATSAPP'\)/);
  assert.match(schema, /foreign key \(business_id, conversation_id\)/);
  assert.match(schema, /foreign key \(business_id, contact_id\)/);
  assert.match(schema, /from public\.wa_customer_profiles as profile/);
  assert.match(schema, /'OWNER', 'MANAGER', 'STAFF', 'VIEWER'/);
  assert.doesNotMatch(schema, /\bto (anon|authenticated)\b/i);
});

function canonicalOneMessageDocument(id: string, text: string): CanonicalFlowDocument {
  return {
    schemaVersion: 2,
    startNodeId: id,
    nodes: [{ id, type: "MESSAGE", messages: { en: text } }],
    edges: [],
  };
}

function canonicalChoiceDocument(
  id: string,
  options: Array<[string, string]>,
): CanonicalFlowDocument {
  return {
    schemaVersion: 2,
    startNodeId: id,
    nodes: [
      {
        id,
        type: "MAIN_MENU",
        messages: { en: "Choose" },
        options: options.map(([key, label]) => ({ key, label: { en: label } })),
      },
      { id: "end", type: "END", messages: { en: "Done" } },
    ],
    edges: options.map(([key]) => ({ id: `${id}_${key}`, from: id, to: "end", condition: key })),
  };
}

function messageOptionsVisualFlow(options: { optionActive: boolean }): VisualFlowDefinition {
  const now = "2026-07-12T00:00:00.000Z";
  return {
    version: 1,
    metadata: {
      name: "Scratch support flow",
      languageSupport: ["en", "ar"],
      defaultLanguage: "en",
    },
    nodes: [
      {
        id: "message_welcome",
        type: "SEND_MESSAGE",
        title: "Message Welcome",
        position: { x: 0, y: 0 },
        config: {
          messages: {
            en: "Welcome. Need help?",
            ar: "\u0623\u0647\u0644\u0627. \u0647\u0644 \u062a\u062d\u062a\u0627\u062c \u0645\u0633\u0627\u0639\u062f\u0629\u061f",
          },
          messageBehavior: "options",
          menuOptions: [
            {
              key: "Human support",
              label: { en: "I need Support", ar: "\u062e\u064a\u0627\u0631" },
              targetNodeId: "talk_to_human",
              active: options.optionActive,
            },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "talk_to_human",
        type: "HUMAN_HANDOFF",
        title: "Talk to human",
        position: { x: 240, y: 0 },
        config: {
          messages: { en: "A team member will help you shortly.", ar: "" },
          labels: { en: "Talk to human", ar: "" },
          handoff: {
            pauseBot: true,
            ownerAlert: true,
            returnBehavior: "stay_paused",
          },
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    edges: [],
  };
}
