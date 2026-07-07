import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultFlowDefinition,
  flowToBotFlowSettings,
  validateFlowDefinition,
  type FlowDefinition,
} from "../../src/lib/whatsapp/flow-template-types.ts";
import {
  addVisualNode,
  compileVisualFlowToRuntimeFlow,
  connectVisualNodes,
  createVisualFlowFromRuntime,
  getEffectiveVisualEdges,
  validateVisualFlow,
} from "../../src/lib/whatsapp/visual-flow-builder.ts";

test("validates the standard online store flow template", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const validation = validateFlowDefinition(flow);

  assert.equal(validation.ok, true);
  assert.equal(
    validation.issues.some((issue) => issue.severity === "ERROR"),
    false,
  );
});

test("rejects broken flow templates before publishing", () => {
  const flow: FlowDefinition = {
    ...createDefaultFlowDefinition("STANDARD_ONLINE_STORE"),
    startNodeId: "missing",
    edges: [{ id: "broken", from: "start", to: "missing", condition: null }],
  };
  const validation = validateFlowDefinition(flow);

  assert.equal(validation.ok, false);
  assert.equal(
    validation.issues.some((issue) => issue.code === "START_MISSING"),
    true,
  );
  assert.equal(
    validation.issues.some((issue) => issue.code === "BROKEN_EDGE"),
    true,
  );
});

test("rejects unsafe order nodes without protected backend actions", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const unsafe = {
    ...flow,
    nodes: flow.nodes.map((node) =>
      node.type === "ORDER_CONFIRMATION" ? { ...node, protectedAction: undefined } : node,
    ),
  };
  const validation = validateFlowDefinition(unsafe);

  assert.equal(validation.ok, false);
  assert.equal(
    validation.issues.some((issue) => issue.code === "PROTECTED_ACTION_REQUIRED"),
    true,
  );
});

test("maps flow copy and toggles to existing deterministic engine settings", () => {
  const flow = createDefaultFlowDefinition("CLOTHING");
  const settings = flowToBotFlowSettings("business-a", {
    ...flow,
    copy: {
      ...flow.copy,
      welcome: { en: "Custom welcome", ar: "\u0645\u0631\u062d\u0628\u0627" },
      orderButton: { en: "Shop now", ar: "\u062a\u0633\u0648\u0642" },
    },
  });

  assert.equal(settings.businessId, "business-a");
  assert.equal(settings.welcomeMessageEnglish, "Custom welcome");
  assert.equal(settings.orderButtonEnglish, "Shop now");
  assert.equal(settings.orderNotesEnabled, true);
});

test("creates and validates a visual draft from a runtime flow", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const visual = createVisualFlowFromRuntime(flow);
  const validation = validateVisualFlow(visual);

  assert.equal(
    visual.nodes.some((node) => node.type === "START"),
    true,
  );
  assert.equal(validation.ok, true);
});

test("adds and connects visual nodes", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const withQuestion = addVisualNode(createVisualFlowFromRuntime(flow), "QUESTION");
  const question = withQuestion.nodes.find((node) => node.type === "QUESTION");
  assert.ok(question);

  const connected = connectVisualNodes(withQuestion, "main_menu", question.id);
  assert.equal(
    connected.edges.some(
      (edge) => edge.sourceNodeId === "main_menu" && edge.targetNodeId === question.id,
    ),
    true,
  );
});

test("compiles visual flow to protected runtime flow", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const visual = createVisualFlowFromRuntime(flow);
  const result = compileVisualFlowToRuntimeFlow(visual, flow);

  assert.equal(result.ok, true);
  assert.ok(result.flow);
  assert.deepEqual(result.flow.visualFlow, {
    ...visual,
    edges: getEffectiveVisualEdges(visual),
  });
  assert.equal(
    result.flow.nodes.find((node) => node.type === "ORDER_CONFIRMATION")?.protectedAction,
    "order.create_pending",
  );
});

test("uses main menu message as the real chat intro when compiling visual flow", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const visual = createVisualFlowFromRuntime(flow);
  const editedVisual = {
    ...visual,
    nodes: visual.nodes.map((node) => {
      if (node.type === "START") {
        return { ...node, config: { ...node.config, messages: { en: "Entry only", ar: "" } } };
      }
      if (node.type === "MAIN_MENU") {
        return {
          ...node,
          config: { ...node.config, messages: { en: "Real menu intro", ar: "القائمة الحقيقية" } },
        };
      }
      return node;
    }),
  };
  const result = compileVisualFlowToRuntimeFlow(editedVisual, flow);

  assert.equal(result.ok, true);
  assert.equal(result.flow?.copy.welcome.en, "Real menu intro");
});

test("maps language selection message into runtime bot settings", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const visual = createVisualFlowFromRuntime(flow);
  const editedVisual = {
    ...visual,
    nodes: visual.nodes.map((node) =>
      node.type === "LANGUAGE_SELECTION"
        ? {
            ...node,
            config: {
              ...node.config,
              messages: { en: "Which language should we use?", ar: "اختر لغة المحادثة:" },
            },
          }
        : node,
    ),
  };
  const result = compileVisualFlowToRuntimeFlow(editedVisual, flow);

  assert.equal(result.ok, true);
  assert.equal(
    flowToBotFlowSettings("business-1", result.flow).languagePromptEnglish,
    "Which language should we use?",
  );
  assert.equal(
    flowToBotFlowSettings("business-1", result.flow).languagePromptArabic,
    "اختر لغة المحادثة:",
  );
});

test("rejects visual flow without a start block", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const visual = {
    ...createVisualFlowFromRuntime(flow),
    nodes: createVisualFlowFromRuntime(flow).nodes.filter((node) => node.type !== "START"),
  };
  const validation = validateVisualFlow(visual);

  assert.equal(validation.ok, false);
  assert.equal(
    validation.issues.some((issue) => issue.code === "VISUAL_START_REQUIRED"),
    true,
  );
});
