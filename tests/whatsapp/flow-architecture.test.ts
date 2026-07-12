import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CANONICAL_FLOW_SCHEMA_VERSION,
  convertLegacyRuntimeFlowToCanonical,
  loadCanonicalFlowDocument,
  type CanonicalFlowDocument,
} from "../../src/lib/whatsapp/flow-document.ts";
import { validateFlow } from "../../src/lib/whatsapp/flow-validation.ts";
import {
  createDefaultFlowDefinition,
  type FlowDefinition,
} from "../../src/lib/whatsapp/flow-template-types.ts";
import {
  createVisualFlowFromRuntime,
} from "../../src/lib/whatsapp/visual-flow-builder.ts";

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
  assert.equal(runtimeDocument.nodes.some((node) => node.id === "main_menu"), true);
  assert.equal(visualDocument.ok, true);
  if (visualDocument.ok) {
    assert.equal(visualDocument.document.nodes.some((node) => node.id === "main_menu"), true);
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
  assert.equal(draft.diagnostics.some((diagnostic) => diagnostic.severity === "warning"), true);
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
    optionValidation.diagnostics.some((diagnostic) => diagnostic.code === "PUBLISH_WHATSAPP_BUTTON_LIMIT"),
    true,
  );
  assert.equal(conditionValidation.ok, false);
  assert.equal(
    conditionValidation.diagnostics.some((diagnostic) => diagnostic.code === "CONDITION_UNSUPPORTED_FOR_PUBLISH"),
    true,
  );
});

test("business flow publishing creates a new published snapshot in source", () => {
  const source = readFileSync("src/lib/whatsapp/flow-template-store.server.ts", "utf8");

  assert.match(source, /const publishedVersion: BusinessFlowVersionRow =/);
  assert.match(source, /status: "PUBLISHED"/);
  assert.match(source, /active_version_id: publishedVersion\.id/);
  assert.doesNotMatch(source, /version\.status = "PUBLISHED"/);
});

test("session runtime loading uses pinned flow versions in source", () => {
  const source = readFileSync("src/lib/whatsapp/conversation-engine.server.ts", "utf8");

  assert.match(source, /getBusinessFlowVersion\(\{ businessId, versionId: session\.flowVersionId/);
  assert.match(source, /conversation\.flow_version_legacy_session_pinned/);
  assert.match(source, /conversation\.flow_version_missing/);
  assert.doesNotMatch(source, /flow\.edges\.length > 0/);
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
