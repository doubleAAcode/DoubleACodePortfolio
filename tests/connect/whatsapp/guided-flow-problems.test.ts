import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createGuidedFlowProblems,
  guidedProblemActionLabel,
  guidedProblemControl,
} from "../../../src/features/connect/flow-manager-ui/guided-flow-problems.ts";
import type { CanonicalFlowDocument } from "../../../src/features/connect/shared/flow-document.ts";

test("Guided problems deduplicate draft warnings, order blockers first, and retain cleanup warnings", () => {
  const problems = createGuidedFlowProblems(problemFixture());
  const firstWarning = problems.findIndex((problem) => problem.severity === "WARNING");
  assert.ok(firstWarning > 0);
  assert.equal(
    problems.slice(0, firstWarning).every((problem) => problem.severity === "ERROR"),
    true,
  );
  assert.equal(
    problems.slice(firstWarning).every((problem) => problem.severity === "WARNING"),
    true,
  );

  assert.equal(
    problems.filter((problem) => problem.nodeId === "start" && /message/i.test(problem.code))
      .length,
    1,
  );
  assert.ok(problems.some((problem) => problem.code === "PUBLISH_MESSAGE_EMPTY"));
  assert.ok(problems.some((problem) => problem.code === "PUBLISH_AUTOMATIC_ROUTE_AMBIGUOUS"));
  assert.ok(problems.some((problem) => problem.code === "PUBLISH_CHOICE_KEY_DUPLICATE"));
  assert.ok(problems.some((problem) => problem.code === "PUBLISH_CHOICE_LABEL_DUPLICATE"));
  assert.ok(problems.some((problem) => problem.code === "PUBLISH_CHOICE_EDGE_TARGET_MISMATCH"));
  assert.ok(problems.some((problem) => problem.code === "PUBLISH_TERMINAL_CONTINUES"));
  assert.ok(
    problems.some((problem) => problem.code === "UNREACHABLE_NODE" && problem.nodeId === "orphan"),
  );
});

test("Guided problems map each diagnostic to the exact repair surface", () => {
  assert.equal(guidedProblemControl({ code: "UNREACHABLE_NODE", nodeId: "orphan" }), "map");
  assert.equal(guidedProblemControl({ code: "PUBLISH_MESSAGE_EMPTY", nodeId: "start" }), "message");
  assert.equal(
    guidedProblemControl({
      code: "PUBLISH_CHOICE_LABEL_DUPLICATE",
      nodeId: "menu",
      path: "options.go.label.en",
    }),
    "choices",
  );
  assert.equal(
    guidedProblemControl({
      code: "PUBLISH_CHOICE_TARGET_MISSING",
      nodeId: "menu",
      path: "options.go.targetNodeId",
    }),
    "destination",
  );
  assert.equal(
    guidedProblemControl({ code: "PUBLISH_IMAGE_URL_MISSING", nodeId: "image" }),
    "media",
  );
  assert.equal(guidedProblemControl({ code: "PUBLISH_START_MISSING" }), "advanced");
  assert.equal(guidedProblemActionLabel("destination"), "Fix route");
});

test("Guided Problems UI exposes blocker counts and focusable repair controls", async () => {
  const [workspace, editor] = await Promise.all([
    readFile("src/features/connect/flow-manager-ui/guided-flow-workspace.tsx", "utf8"),
    readFile("src/features/connect/flow-manager-ui/guided-flow-editor.tsx", "utf8"),
  ]);
  assert.match(workspace, /publish.*blocker/);
  assert.match(workspace, /Blocks publish/);
  assert.match(workspace, /guidedProblemActionLabel/);
  assert.match(workspace, /scrollIntoView/);
  assert.match(editor, /data-guided-control="message"/);
  assert.match(editor, /data-guided-control="choices"/);
  assert.match(editor, /data-guided-control="destination"/);
  assert.match(editor, /data-guided-control="media"/);
  assert.match(editor, /data-guided-tree-node/);
  assert.match(editor, /Automatic continuation/);
});

function problemFixture(): CanonicalFlowDocument {
  return {
    schemaVersion: 2,
    startNodeId: "start",
    nodes: [
      { id: "start", type: "MESSAGE", title: "Start", messages: { en: "" } },
      {
        id: "menu",
        type: "MAIN_MENU",
        title: "Menu",
        messages: { en: "Choose" },
        options: [
          {
            key: "go",
            label: { en: "Go" },
            targetNodeId: "end",
            active: true,
            sortOrder: 1,
          },
          {
            key: "go",
            label: { en: "Go" },
            targetNodeId: "end",
            active: true,
            sortOrder: 2,
          },
        ],
      },
      { id: "end", type: "END", title: "End" },
      { id: "orphan", type: "MESSAGE", title: "Orphan", messages: { en: "" } },
    ],
    edges: [
      { id: "start-menu", from: "start", to: "menu" },
      { id: "start-end", from: "start", to: "end" },
      { id: "menu-go", from: "menu", to: "start", condition: "go" },
      { id: "end-start", from: "end", to: "start" },
    ],
  };
}
