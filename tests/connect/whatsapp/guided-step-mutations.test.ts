import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  addGuidedOption,
  createGuidedNode,
  deleteGuidedNode,
  duplicateGuidedNode,
  listGuidedInboundReferences,
  moveGuidedNode,
  removeGuidedOption,
  updateGuidedAutomaticDestination,
  updateGuidedOption,
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

test("Guided choice creation enforces WhatsApp limits and creates one stable route", () => {
  const first = addGuidedOption(fixture(), "start", {
    labelEn: "Ask prices",
    labelAr: "Prices AR",
    targetNodeId: "details",
  });
  assert.equal(first.optionKey, "ask_prices");
  assert.deepEqual(first.document.nodes[0]?.options?.[0], {
    key: "ask_prices",
    label: { en: "Ask prices", ar: "Prices AR" },
    active: true,
    sortOrder: 1,
    targetNodeId: "details",
  });
  assert.deepEqual(
    first.document.edges.filter((edge) => edge.from === "start" && edge.condition === "ask_prices"),
    [
      {
        id: "edge_start_ask_prices",
        from: "start",
        to: "details",
        condition: "ask_prices",
      },
    ],
  );
  assert.throws(
    () =>
      addGuidedOption(first.document, "start", {
        labelEn: "Ask prices",
        targetNodeId: "end",
      }),
    /different English button text/,
  );
  assert.throws(
    () =>
      addGuidedOption(fixture(), "start", {
        labelEn: "Arabic too long",
        labelAr: "x".repeat(21),
        targetNodeId: "end",
      }),
    /Arabic button text must be 20 characters/,
  );

  const second = addGuidedOption(first.document, "start", {
    labelEn: "Store info",
    targetNodeId: "menu",
  });
  const third = addGuidedOption(second.document, "start", {
    labelEn: "Talk to us",
    targetNodeId: "end",
  });
  assert.throws(
    () =>
      addGuidedOption(third.document, "start", {
        labelEn: "Fourth reply",
        targetNodeId: "end",
      }),
    /at most three reply choices/,
  );
});

test("Guided choice updates and removal keep canonical options and edges synchronized", () => {
  const document = fixture();
  const redirected = updateGuidedOption(document, "menu", "details", (option) => ({
    ...option,
    targetNodeId: "end",
  }));
  const redirectedEdges = redirected.edges.filter(
    (edge) => edge.from === "menu" && edge.condition === "details",
  );
  assert.deepEqual(redirectedEdges, [
    { id: "edge-details", from: "menu", to: "end", condition: "details" },
  ]);

  const cleared = updateGuidedOption(redirected, "menu", "details", (option) => ({
    ...option,
    targetNodeId: undefined,
  }));
  assert.equal(
    cleared.edges.some((edge) => edge.from === "menu" && edge.condition === "details"),
    false,
  );

  const withSecond = addGuidedOption(document, "menu", {
    labelEn: "End now",
    targetNodeId: "end",
  });
  const removed = removeGuidedOption(withSecond.document, "menu", "details");
  assert.deepEqual(removed.nodes.find((node) => node.id === "menu")?.options, [
    {
      key: "end_now",
      label: { en: "End now", ar: "" },
      active: true,
      sortOrder: 1,
      targetNodeId: "end",
    },
  ]);
  assert.equal(
    removed.edges.some((edge) => edge.from === "menu" && edge.condition === "details"),
    false,
  );
  assert.equal(
    removed.edges.filter((edge) => edge.from === "menu" && edge.condition === "end_now").length,
    1,
  );
});

test("Guided automatic destinations preserve one stable edge and repair duplicates", () => {
  const document = fixture();
  const redirected = updateGuidedAutomaticDestination(document, "details", "menu");
  assert.deepEqual(
    redirected.edges.filter((edge) => edge.from === "details" && !edge.condition),
    [{ id: "edge-end", from: "details", to: "menu", condition: null }],
  );

  const duplicated: CanonicalFlowDocument = {
    ...redirected,
    edges: [
      ...redirected.edges,
      { id: "edge-end-copy", from: "details", to: "start", condition: null },
    ],
  };
  const repaired = updateGuidedAutomaticDestination(duplicated, "details", "end");
  assert.deepEqual(
    repaired.edges.filter((edge) => edge.from === "details" && !edge.condition),
    [{ id: "edge-end", from: "details", to: "end", condition: null }],
  );
  const removed = updateGuidedAutomaticDestination(repaired, "details", undefined);
  assert.equal(
    removed.edges.some((edge) => edge.from === "details" && !edge.condition),
    false,
  );
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
  assert.match(editor, /onAddChoice/);
  assert.match(editor, /onRemoveChoice/);
  assert.doesNotMatch(editor, /New choices ship with/);
  assert.match(dialogs, /New choice destination/);
  assert.match(dialogs, /Confirm remove choice/);
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
