import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createGuidedNode,
  deleteGuidedNode,
  duplicateGuidedNode,
  listGuidedInboundReferences,
  moveGuidedNode,
} from "../../../src/features/connect/flow-manager-ui/guided-flow-draft.ts";
import type { CanonicalFlowDocument } from "../../../src/features/connect/shared/flow-document.ts";

test("Guided creates and duplicates steps with stable unique node and edge ids", () => {
  const created = createGuidedNode(fixture(), {
    type: "IMAGE_MESSAGE",
    title: "Product photo",
  });
  assert.equal(created.nodeId, "step_image_message");
  assert.equal(created.document.nodes.at(-1)?.id, "step_image_message");
  assert.deepEqual(created.document.nodes.at(-1)?.mediaCaption, { en: "", ar: "" });

  const duplicated = duplicateGuidedNode(created.document, "menu");
  assert.equal(duplicated.nodeId, "menu_copy");
  assert.deepEqual(
    duplicated.document.nodes.map((node) => node.id),
    ["start", "menu", "menu_copy", "details", "end", "step_image_message"],
  );
  const duplicate = duplicated.document.nodes.find((node) => node.id === "menu_copy");
  assert.equal(duplicate?.title, "Choose a path copy");
  assert.equal(duplicate?.options?.[0]?.targetNodeId, "details");
  const duplicateEdges = duplicated.document.edges.filter((edge) => edge.from === "menu_copy");
  assert.equal(duplicateEdges.length, 1);
  assert.equal(new Set(duplicated.document.edges.map((edge) => edge.id)).size, 3);
});

test("Guided reorders saved steps without changing stable ids or destinations", () => {
  const document = fixture();
  const moved = moveGuidedNode(document, "end", "up");
  assert.deepEqual(
    moved.nodes.map((node) => node.id),
    ["start", "menu", "end", "details"],
  );
  assert.deepEqual(moved.edges, document.edges);
  assert.equal(
    moved.nodes.find((node) => node.id === "menu")?.options?.[0]?.targetNodeId,
    "details",
  );
  assert.strictEqual(moveGuidedNode(document, "start", "down"), document);
});

test("Guided deletion requires and applies explicit inbound route repair", () => {
  const document = fixture();
  assert.deepEqual(listGuidedInboundReferences(document, "details"), [
    { kind: "option", sourceNodeId: "menu", optionKey: "details" },
  ]);
  assert.throws(() => deleteGuidedNode(document, "details"), /Choose how to repair routes/);

  const redirected = deleteGuidedNode(document, "details", {
    mode: "replace",
    replacementNodeId: "end",
  });
  assert.equal(
    redirected.nodes.some((node) => node.id === "details"),
    false,
  );
  assert.equal(
    redirected.nodes.find((node) => node.id === "menu")?.options?.[0]?.targetNodeId,
    "end",
  );
  assert.equal(redirected.edges.find((edge) => edge.id === "edge-details")?.to, "end");
  assert.equal(
    redirected.edges.some((edge) => edge.from === "details"),
    false,
  );
  assert.equal(redirected.editorMetadata?.positions?.details, undefined);

  const removed = deleteGuidedNode(document, "details", { mode: "remove" });
  assert.equal(
    removed.nodes.find((node) => node.id === "menu")?.options?.[0]?.targetNodeId,
    undefined,
  );
  assert.equal(
    removed.edges.some((edge) => edge.to === "details"),
    false,
  );
  assert.throws(() => deleteGuidedNode(document, "start"), /start step cannot be deleted/i);
});

test("Guided step controls are real draft actions with a route-repair dialog", async () => {
  const [editor, workspace, dialogs] = await Promise.all([
    readFile("src/features/connect/flow-manager-ui/guided-flow-editor.tsx", "utf8"),
    readFile("src/features/connect/flow-manager-ui/guided-flow-workspace.tsx", "utf8"),
    readFile("src/features/connect/flow-manager-ui/guided-flow-step-dialogs.tsx", "utf8"),
  ]);

  assert.doesNotMatch(editor, /Move step up - Future/);
  assert.doesNotMatch(editor, /Delete step - Future/);
  assert.doesNotMatch(editor, /More step actions - Future/);
  assert.match(editor, /aria-label="Duplicate step"/);
  assert.match(editor, /onAddStep/);
  assert.match(workspace, /duplicateGuidedNode/);
  assert.match(workspace, /moveGuidedNode/);
  assert.match(workspace, /deleteGuidedNode/);
  assert.match(dialogs, /Repair incoming routes/);
  assert.match(dialogs, /Remove their destinations/);
  assert.match(dialogs, /Redirect to/);
});

function fixture(): CanonicalFlowDocument {
  return {
    schemaVersion: 2,
    startNodeId: "start",
    nodes: [
      {
        id: "start",
        type: "MESSAGE",
        title: "Start",
        messages: { en: "Welcome" },
      },
      {
        id: "menu",
        type: "MAIN_MENU",
        title: "Choose a path",
        messages: { en: "Choose" },
        options: [
          {
            key: "details",
            label: { en: "Details" },
            targetNodeId: "details",
            active: true,
            sortOrder: 1,
          },
        ],
      },
      {
        id: "details",
        type: "MESSAGE",
        title: "Details",
        messages: { en: "Here are the details" },
      },
      {
        id: "end",
        type: "END",
        title: "End",
      },
    ],
    edges: [
      { id: "edge-details", from: "menu", to: "details", condition: "details" },
      { id: "edge-end", from: "details", to: "end" },
    ],
    editorMetadata: {
      positions: {
        details: { x: 20, y: 40 },
      },
    },
  };
}
