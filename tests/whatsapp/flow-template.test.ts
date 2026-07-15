import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultFlowDefinition,
  flowToBotFlowSettings,
  validateFlowDefinition,
  type FlowDefinition,
} from "../../src/lib/whatsapp/flow-template-types.ts";
import { validateFlow } from "../../src/lib/whatsapp/flow-validation.ts";
import {
  canonicalFlowToRuntimeFlow,
  convertLegacyVisualFlowToCanonical,
} from "../../src/lib/whatsapp/flow-document.ts";
import { validateFlowForEditor } from "../../src/lib/whatsapp/flow-editor.ts";
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

test("official admin templates validate and preserve intended commerce scope", () => {
  const ecommerce = createDefaultFlowDefinition("ECOMMERCE");
  const restaurant = createDefaultFlowDefinition("RESTAURANT");
  const greeting = createDefaultFlowDefinition("GREETING_STORE_INFO");

  for (const flow of [ecommerce, restaurant, greeting]) {
    const validation = validateFlowDefinition(flow);
    const publishValidation = validateFlow(flow, { mode: "publish" });
    const editorValidation = validateFlowForEditor(flow);
    assert.equal(validation.ok, true, `${flow.name} should validate`);
    assert.equal(publishValidation.ok, true, `${flow.name} should pass publish validation`);
    assert.equal(editorValidation.ok, true, `${flow.name} should pass editor validation`);
    assert.equal(
      validation.issues.some((issue) => issue.severity === "ERROR"),
      false,
      `${flow.name} should have no validation errors`,
    );
  }

  assert.equal(ecommerce.nodes.some((node) => node.type === "ORDER_CONFIRMATION"), true);
  assert.equal(restaurant.nodes.some((node) => node.type === "ORDER_CONFIRMATION"), true);
  assert.equal(greeting.nodes.some((node) => node.type === "ORDER_CONFIRMATION"), false);
  assert.equal(greeting.nodes.some((node) => node.type === "CATEGORY_SELECT"), false);
  assert.equal(greeting.edges.some((edge) => edge.from === "store_info"), false);

  const greetingSettings = flowToBotFlowSettings("business-a", greeting);
  assert.deepEqual(
    greetingSettings.mainMenuOptions.map((option) => option.key),
    ["store_info", "support"],
  );
});

test("greeting template clone preserves start options and targets in the visual builder", () => {
  const greeting = createDefaultFlowDefinition("GREETING_STORE_INFO");
  const visual = createVisualFlowFromRuntime(greeting);
  const start = visual.nodes.find((node) => node.id === "start");
  const effectiveEdges = getEffectiveVisualEdges(visual);
  const visualValidation = validateVisualFlow(visual);
  const compiled = compileVisualFlowToRuntimeFlow(visual, greeting);

  assert.equal(start?.type, "START");
  assert.deepEqual(
    start?.config.menuOptions?.map((option) => ({
      key: option.key,
      targetNodeId: option.targetNodeId,
      active: option.active,
    })),
    [
      { key: "store_info", targetNodeId: "store_info", active: true },
      { key: "support", targetNodeId: "human_handoff", active: true },
    ],
  );
  assert.equal(
    visualValidation.issues.some((issue) => issue.code === "VISUAL_ENTRY_NEXT_REQUIRED"),
    false,
  );
  assert.equal(
    visualValidation.issues.some((issue) =>
      issue.message.includes("not reachable from the first WhatsApp message"),
    ),
    false,
  );
  assert.equal(visualValidation.ok, true);
  assert.equal(
    effectiveEdges.some(
      (edge) =>
        edge.sourceNodeId === "start" &&
        edge.targetNodeId === "store_info" &&
        edge.condition === "store_info",
    ),
    true,
  );
  assert.equal(
    effectiveEdges.some(
      (edge) =>
        edge.sourceNodeId === "start" &&
        edge.targetNodeId === "human_handoff" &&
        edge.condition === "support",
    ),
    true,
  );
  assert.equal(compiled.ok, true);
  assert.equal(compiled.flow?.nodes.find((node) => node.id === "start")?.type, "MAIN_MENU");
  assert.deepEqual(
    compiled.flow?.editor?.mainMenuOptions?.map((option) => ({
      key: option.key,
      targetNodeId: option.targetNodeId,
      active: option.active,
    })),
    [
      { key: "store_info", targetNodeId: "store_info", active: true },
      { key: "support", targetNodeId: "human_handoff", active: true },
    ],
  );
});

test("ecommerce template clone preserves protected purchase pipeline nodes", () => {
  const ecommerce = createDefaultFlowDefinition("ECOMMERCE");
  const visual = createVisualFlowFromRuntime(ecommerce);
  const legacyVisual = {
    ...visual,
    nodes: visual.nodes.map((node) =>
      ["product_options", "custom_fields", "quantity"].includes(node.id)
        ? { ...node, type: "SEND_MESSAGE" as const }
        : node,
    ),
  };
  const canonical = convertLegacyVisualFlowToCanonical(visual, ecommerce);
  const legacyCanonical = convertLegacyVisualFlowToCanonical(legacyVisual, ecommerce);
  const compiled = compileVisualFlowToRuntimeFlow(visual, ecommerce);
  const legacyCompiled = compileVisualFlowToRuntimeFlow(legacyVisual, ecommerce);

  for (const nodeId of ["product_options", "custom_fields", "quantity"]) {
    assert.equal(canonical.nodes.find((node) => node.id === nodeId)?.type, nodeId.toUpperCase());
    assert.equal(
      legacyCanonical.nodes.find((node) => node.id === nodeId)?.type,
      nodeId.toUpperCase(),
    );
    assert.equal(visual.nodes.find((node) => node.id === nodeId)?.type, nodeId.toUpperCase());
  }

  assert.equal(validateFlow({ ...ecommerce, visualFlow: visual }, { mode: "publish" }).ok, true);
  assert.equal(validateFlow({ ...ecommerce, visualFlow: legacyVisual }, { mode: "publish" }).ok, true);
  assert.equal(compiled.ok, true);
  assert.equal(legacyCompiled.ok, true);
  assert.equal(
    compiled.flow?.nodes.find((node) => node.id === "product_options")?.type,
    "PRODUCT_OPTIONS",
  );
  assert.equal(compiled.flow?.nodes.find((node) => node.id === "custom_fields")?.type, "CUSTOM_FIELDS");
  assert.equal(compiled.flow?.nodes.find((node) => node.id === "quantity")?.type, "QUANTITY");
  assert.equal(
    legacyCompiled.flow?.nodes.find((node) => node.id === "product_options")?.type,
    "PRODUCT_OPTIONS",
  );
  assert.equal(
    legacyCompiled.flow?.nodes.find((node) => node.id === "custom_fields")?.type,
    "CUSTOM_FIELDS",
  );
  assert.equal(legacyCompiled.flow?.nodes.find((node) => node.id === "quantity")?.type, "QUANTITY");
});

test("image reply option preserves media and can return to the previous options message", () => {
  const baseFlow = createDefaultFlowDefinition("GREETING_STORE_INFO");
  const now = "2026-07-15T00:00:00.000Z";
  const visual = {
    version: 1 as const,
    metadata: {
      name: "Price lists",
      languageSupport: ["en", "ar"] as const,
      defaultLanguage: "en" as const,
    },
    nodes: [
      {
        id: "price_menu",
        type: "SEND_MESSAGE" as const,
        title: "Price list menu",
        position: { x: 0, y: 0 },
        config: {
          messages: { en: "Choose a price list", ar: "" },
          messageBehavior: "options" as const,
          menuOptions: [
            {
              key: "iphone_prices",
              label: { en: "iPhone prices", ar: "" },
              targetNodeId: "iphone_price_image",
              active: true,
            },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "iphone_price_image",
        type: "SEND_IMAGE" as const,
        title: "iPhone price list image",
        position: { x: 240, y: 0 },
        config: {
          mediaUrl: "https://www.doubleacode.com/sample/iphone-prices.jpg",
          mediaCaption: { en: "iPhone price list", ar: "" },
          messageBehavior: "next" as const,
          messageNextNodeId: "price_menu",
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    edges: [],
  };

  const visualValidation = validateVisualFlow(visual);
  const canonical = convertLegacyVisualFlowToCanonical(visual, baseFlow);
  const draftValidation = validateFlow(canonical, { mode: "draft" });
  const publishValidation = validateFlow(canonical, { mode: "publish" });
  const runtime = canonicalFlowToRuntimeFlow(canonical, baseFlow);

  assert.equal(visualValidation.ok, true);
  assert.equal(draftValidation.ok, true);
  assert.equal(publishValidation.ok, true);
  assert.equal(canonical.nodes.find((node) => node.id === "iphone_price_image")?.type, "IMAGE_MESSAGE");
  assert.equal(
    canonical.nodes.find((node) => node.id === "iphone_price_image")?.mediaUrl,
    "https://www.doubleacode.com/sample/iphone-prices.jpg",
  );
  assert.equal(
    runtime.nodes.find((node) => node.id === "iphone_price_image")?.mediaCaption?.en,
    "iPhone price list",
  );
  assert.equal(
    runtime.edges.some(
      (edge) =>
        edge.from === "price_menu" &&
        edge.to === "iphone_price_image" &&
        edge.condition === "iphone_prices",
    ),
    true,
  );
  assert.equal(
    runtime.edges.some((edge) => edge.from === "iphone_price_image" && edge.to === "price_menu"),
    true,
  );
});

test("image reply publish validation requires a public image URL", () => {
  const baseFlow = createDefaultFlowDefinition("GREETING_STORE_INFO");
  const canonical = convertLegacyVisualFlowToCanonical(
    {
      version: 1,
      metadata: {
        name: "Missing image",
        languageSupport: ["en", "ar"],
        defaultLanguage: "en",
      },
      nodes: [
        {
          id: "missing_image",
          type: "SEND_IMAGE",
          title: "Missing image",
          position: { x: 0, y: 0 },
          config: { mediaUrl: "", mediaCaption: { en: "Missing image", ar: "" }, messageBehavior: "end" },
          createdAt: "2026-07-15T00:00:00.000Z",
          updatedAt: "2026-07-15T00:00:00.000Z",
        },
      ],
      edges: [],
    },
    baseFlow,
  );
  const validation = validateFlow(canonical, { mode: "publish" });

  assert.equal(
    validation.diagnostics.some((diagnostic) => diagnostic.code === "PUBLISH_IMAGE_URL_MISSING"),
    true,
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

test("allows a visual flow to use the first block as the entry when no start block exists", () => {
  const flow = createDefaultFlowDefinition("STANDARD_ONLINE_STORE");
  const visual = {
    ...createVisualFlowFromRuntime(flow),
    nodes: createVisualFlowFromRuntime(flow).nodes.filter((node) => node.type !== "START"),
    edges: createVisualFlowFromRuntime(flow).edges.filter(
      (edge) => edge.sourceNodeId !== "start" && edge.targetNodeId !== "start",
    ),
  };
  const validation = validateVisualFlow(visual);

  assert.equal(validation.ok, true);
  assert.equal(
    validation.issues.some((issue) => issue.code === "VISUAL_START_REQUIRED"),
    false,
  );
});
