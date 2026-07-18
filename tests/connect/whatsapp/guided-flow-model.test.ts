import assert from "node:assert/strict";
import test from "node:test";

import { createGuidedFlowModel } from "../../../src/features/connect/flow-manager-ui/guided-flow-model.ts";
import {
  loadCanonicalFlowDocument,
  type CanonicalFlowDocument,
} from "../../../src/features/connect/shared/flow-document.ts";
import type {
  BusinessFlowDetails,
  BusinessFlowVersionRow,
} from "../../../src/features/connect/shared/flow-template-store.server.ts";
import { createDefaultFlowDefinition } from "../../../src/features/connect/shared/flow-template-types.ts";

const canonicalDocument: CanonicalFlowDocument = {
  schemaVersion: 2,
  startNodeId: "welcome",
  nodes: [
    {
      id: "welcome",
      type: "MAIN_MENU",
      title: "Welcome menu",
      messages: {
        en: "How can we help?",
        ar: "\u0643\u064a\u0641 \u064a\u0645\u0643\u0646\u0646\u0627 \u0645\u0633\u0627\u0639\u062f\u062a\u0643\u061f",
      },
      options: [
        {
          key: "ask",
          label: {
            en: "Ask a question",
            ar: "\u0627\u0637\u0631\u062d \u0633\u0624\u0627\u0644\u0627\u064b",
          },
          targetNodeId: "question",
          active: true,
          sortOrder: 1,
        },
      ],
    },
    {
      id: "question",
      type: "MESSAGE",
      title: "Question",
      messages: { en: "What would you like to know?" },
      optional: true,
    },
    { id: "end", type: "END", title: "Close conversation" },
    { id: "saved-orphan", type: "MESSAGE", messages: { en: "Saved but unreachable" } },
  ],
  edges: [
    { id: "welcome-question", from: "welcome", to: "question", condition: "ask" },
    { id: "question-end", from: "question", to: "end" },
  ],
  editorMetadata: {
    positions: {
      welcome: { x: 10, y: 20 },
      question: { x: 30, y: 40 },
    },
  },
};

test("Guided maps the canonical draft losslessly with stable ordering and destinations", () => {
  const published = version("published-v1", 1, "PUBLISHED", canonicalDocument);
  const draft = version("draft-v2", 2, "DRAFT", canonicalDocument, {
    code: "QUESTION_COPY",
    message: "Question copy needs review.",
    severity: "WARNING",
    nodeId: "question",
  });
  const result = createGuidedFlowModel(details([published, draft], published));

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.model.version.id, "draft-v2");
  assert.equal(result.model.source, "canonical_v2");
  assert.deepEqual(result.model.document, canonicalDocument);
  assert.deepEqual(
    result.model.steps.map((step) => step.id),
    ["welcome", "question", "end", "saved-orphan"],
  );
  assert.equal(result.model.steps[0]?.isStart, true);
  assert.equal(result.model.steps[0]?.options[0]?.targetNodeId, "question");
  assert.equal(result.model.steps[0]?.options[0]?.targetTitle, "Question");
  assert.equal(result.model.steps[1]?.status, "warning");
  assert.equal(result.model.steps[3]?.preview, "Saved but unreachable");

  const reloaded = loadCanonicalFlowDocument(result.model.document);
  assert.equal(reloaded.ok, true);
  if (reloaded.ok) assert.deepEqual(reloaded.document, canonicalDocument);
});

test("Guided can inspect an explicitly selected immutable version", () => {
  const publishedDocument: CanonicalFlowDocument = {
    ...canonicalDocument,
    nodes: canonicalDocument.nodes.map((node) =>
      node.id === "welcome" ? { ...node, messages: { en: "Published welcome" } } : node,
    ),
  };
  const published = version("published-v1", 1, "PUBLISHED", publishedDocument);
  const draft = version("draft-v2", 2, "DRAFT", canonicalDocument);
  const result = createGuidedFlowModel(details([draft, published], published), published.id);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.model.version.id, published.id);
  assert.equal(result.model.steps[0]?.messages.en, "Published welcome");
  assert.equal(result.model.activeVersionId, published.id);
});

test("Guided returns stable empty and unsupported-document errors", () => {
  assert.deepEqual(createGuidedFlowModel({ flow: null, versions: [], activeVersion: null }), {
    ok: false,
    code: "NO_FLOW",
    message: "No WhatsApp flow has been created for this business yet.",
    diagnostics: [],
  });

  const noVersion = details([]);
  assert.equal(createGuidedFlowModel(noVersion).ok, false);

  const invalid = version("draft-v1", 1, "DRAFT", {
    ...canonicalDocument,
    schemaVersion: 99,
  } as unknown as CanonicalFlowDocument);
  const invalidResult = createGuidedFlowModel(details([invalid]));
  assert.equal(invalidResult.ok, false);
  if (!invalidResult.ok) {
    assert.equal(invalidResult.code, "INVALID_DOCUMENT");
    assert.equal(invalidResult.diagnostics[0]?.code, "UNSUPPORTED_SCHEMA_VERSION");
  }
});

function details(
  versions: BusinessFlowVersionRow[],
  activeVersion: BusinessFlowVersionRow | null = null,
): BusinessFlowDetails {
  return {
    flow: {
      id: "business-flow",
      business_id: "business-1",
      source_template_id: null,
      name: "Double A WhatsApp flow",
      status: activeVersion ? "PUBLISHED" : "DRAFT",
      active_version_id: activeVersion?.id ?? null,
      created_at: "2026-07-18T08:00:00.000Z",
      updated_at: "2026-07-18T09:00:00.000Z",
    },
    versions,
    activeVersion,
  };
}

function version(
  id: string,
  versionNumber: number,
  status: "DRAFT" | "PUBLISHED",
  document: CanonicalFlowDocument,
  issue?: BusinessFlowVersionRow["validation_result"]["issues"][number],
): BusinessFlowVersionRow {
  return {
    id,
    business_flow_id: "business-flow",
    version_number: versionNumber,
    status,
    flow_json: {
      ...createDefaultFlowDefinition("STANDARD_ONLINE_STORE"),
      canonicalDocument: document,
    },
    validation_result: { ok: !issue || issue.severity !== "ERROR", issues: issue ? [issue] : [] },
    created_by_user_id: "user-1",
    published_at: status === "PUBLISHED" ? "2026-07-18T08:30:00.000Z" : null,
    created_at: "2026-07-18T08:00:00.000Z",
  };
}
