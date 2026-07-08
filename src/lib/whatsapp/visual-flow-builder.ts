import { validateFlowForEditor } from "./flow-editor.ts";
import type {
  FlowCustomQuestion,
  FlowDefinition,
  FlowEdge,
  FlowLanguage,
  FlowMainMenuOption,
  FlowNode,
  FlowNodeType,
  FlowValidationIssue,
  FlowValidationResult,
} from "./flow-template-types.ts";

export type VisualFlowBlockType =
  | "START"
  | "SEND_MESSAGE"
  | "LANGUAGE_SELECTION"
  | "MAIN_MENU"
  | "STORE_INFO"
  | "CATEGORY_SELECTION"
  | "PRODUCT_SELECTION"
  | "PRODUCT_DETAILS"
  | "QUESTION"
  | "CONDITION"
  | "CART_REVIEW"
  | "CHECKOUT_CUSTOMER_NAME"
  | "CHECKOUT_FULFILLMENT"
  | "CHECKOUT_DELIVERY_DETAILS"
  | "CHECKOUT_PAYMENT_METHOD"
  | "CHECKOUT_NOTES"
  | "ORDER_REVIEW"
  | "ORDER_CONFIRMATION"
  | "HUMAN_HANDOFF"
  | "GO_TO_MAIN_MENU"
  | "END";

export type VisualFlowNode = {
  id: string;
  type: VisualFlowBlockType;
  title: string;
  position: { x: number; y: number };
  config: {
    messages?: Partial<Record<FlowLanguage, string>>;
    labels?: Partial<Record<FlowLanguage, string>>;
    question?: FlowCustomQuestion;
    questionNextNodeId?: string;
    questionFallbackNodeId?: string;
    questionSaveTo?: "customer" | "item" | "cart" | "order";
    startBehavior?: "welcome_then_next" | "language_first" | "main_menu" | "custom_step";
    messageBehavior?: "next" | "options" | "end" | "main_menu" | "handoff";
    messageNextNodeId?: string;
    messageFallbackNodeId?: string;
    menuOptions?: Array<{
      key?: string;
      action?: "PLACE_ORDER" | "ASK_QUESTION" | "STORE_INFO" | "HUMAN_HANDOFF";
      label: Record<FlowLanguage, string>;
      targetNodeId?: string;
      active?: boolean;
    }>;
    conditionSource?: string;
    conditionRules?: Array<{
      id: string;
      operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty";
      value: string;
      targetNodeId?: string;
    }>;
    conditionFallbackNodeId?: string;
    handoff?: {
      pauseBot: boolean;
      ownerAlert: boolean;
      returnBehavior: "stay_paused" | "return_to_menu" | "end_conversation";
    };
    fallback?: Partial<Record<FlowLanguage, string>>;
  };
  createdAt: string;
  updatedAt: string;
};

export type VisualFlowEdge = {
  id: string;
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  label: string;
  condition: string | null;
  sortOrder: number;
};

export type VisualFlowDefinition = {
  version: 1;
  nodes: VisualFlowNode[];
  edges: VisualFlowEdge[];
  metadata: {
    name: string;
    languageSupport: FlowLanguage[];
    defaultLanguage: FlowLanguage;
  };
};

export type VisualCompileResult = {
  ok: boolean;
  flow?: FlowDefinition;
  validation: FlowValidationResult;
};

const protectedActions: Partial<Record<FlowNodeType, string>> = {
  CATEGORY_SELECT: "catalog.categories",
  PRODUCT_SELECT: "catalog.products",
  PRODUCT_OPTIONS: "catalog.options",
  CUSTOM_FIELDS: "catalog.custom_fields",
  QUANTITY: "cart.validate_quantity",
  CART_MENU: "cart.service",
  CHECKOUT: "checkout.service",
  ORDER_REVIEW: "order.review",
  ORDER_CONFIRMATION: "order.create_pending",
};

export const visualBlockPalette: Array<{
  type: VisualFlowBlockType;
  title: string;
  category: "Core" | "Catalog" | "Checkout" | "Logic";
}> = [
  { type: "START", title: "Start", category: "Core" },
  { type: "SEND_MESSAGE", title: "Send message", category: "Core" },
  { type: "LANGUAGE_SELECTION", title: "Language", category: "Core" },
  { type: "MAIN_MENU", title: "Main menu", category: "Core" },
  { type: "STORE_INFO", title: "Store info", category: "Core" },
  { type: "CATEGORY_SELECTION", title: "Categories", category: "Catalog" },
  { type: "PRODUCT_SELECTION", title: "Products", category: "Catalog" },
  { type: "PRODUCT_DETAILS", title: "Product details", category: "Catalog" },
  { type: "QUESTION", title: "Question", category: "Logic" },
  { type: "CONDITION", title: "Condition", category: "Logic" },
  { type: "CART_REVIEW", title: "Cart review", category: "Checkout" },
  { type: "CHECKOUT_CUSTOMER_NAME", title: "Customer name", category: "Checkout" },
  { type: "CHECKOUT_FULFILLMENT", title: "Fulfillment", category: "Checkout" },
  { type: "CHECKOUT_DELIVERY_DETAILS", title: "Delivery details", category: "Checkout" },
  { type: "CHECKOUT_PAYMENT_METHOD", title: "Payment", category: "Checkout" },
  { type: "CHECKOUT_NOTES", title: "Notes", category: "Checkout" },
  { type: "ORDER_REVIEW", title: "Order review", category: "Checkout" },
  { type: "ORDER_CONFIRMATION", title: "Order confirmation", category: "Checkout" },
  { type: "HUMAN_HANDOFF", title: "Human handoff", category: "Core" },
  { type: "GO_TO_MAIN_MENU", title: "Go to menu", category: "Logic" },
  { type: "END", title: "End", category: "Core" },
];

export function getVisualFlow(flow: FlowDefinition): VisualFlowDefinition {
  if (isVisualFlow(flow.visualFlow)) return flow.visualFlow;
  return createVisualFlowFromRuntime(flow);
}

export function createVisualFlowFromRuntime(flow: FlowDefinition): VisualFlowDefinition {
  const now = new Date().toISOString();
  const nodeLookup = new Map(flow.nodes.map((node) => [node.id, node]));
  return {
    version: 1,
    metadata: {
      name: flow.name,
      languageSupport: flow.supportedLanguages,
      defaultLanguage: flow.settings.defaultLanguage,
    },
    nodes: flow.nodes.map((node, index) => ({
      id: node.id,
      type: runtimeTypeToVisual(node.type, node.id),
      title: visualTitle(runtimeTypeToVisual(node.type, node.id)),
      position: { x: 80 + (index % 3) * 240, y: 80 + Math.floor(index / 3) * 150 },
      config: configFromRuntimeNode(flow, node),
      createdAt: now,
      updatedAt: now,
    })),
    edges: flow.edges.map((edge, index) => ({
      id: edge.id,
      sourceNodeId: edge.from,
      sourceHandle: edge.condition ?? "next",
      targetNodeId: edge.to,
      label: edge.condition ?? nodeLookup.get(edge.to)?.type ?? "Next",
      condition: edge.condition ?? null,
      sortOrder: index + 1,
    })),
  };
}

export function addVisualNode(
  visualFlow: VisualFlowDefinition,
  type: VisualFlowBlockType,
): VisualFlowDefinition {
  const now = new Date().toISOString();
  const id = `${type.toLowerCase()}_${visualFlow.nodes.length + 1}`;
  return {
    ...visualFlow,
    nodes: [
      ...visualFlow.nodes,
      {
        id,
        type,
        title: visualTitle(type),
        position: { x: 120 + (visualFlow.nodes.length % 4) * 220, y: 120 },
        config: defaultConfig(type),
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

export function addConfiguredVisualNode(
  visualFlow: VisualFlowDefinition,
  type: VisualFlowBlockType,
  options: {
    title?: string;
    afterNodeId?: string;
    nextNodeId?: string;
    position?: { x: number; y: number };
  } = {},
): VisualFlowDefinition {
  const withNode = addVisualNode(visualFlow, type);
  const created = withNode.nodes[withNode.nodes.length - 1];
  const configured: VisualFlowNode = {
    ...created,
    title: options.title?.trim() || created.title,
    position: options.position ?? created.position,
    config: {
      ...created.config,
      messageBehavior:
        type === "SEND_MESSAGE"
          ? options.nextNodeId
            ? "next"
            : "end"
          : created.config.messageBehavior,
      messageNextNodeId:
        type === "SEND_MESSAGE" ? options.nextNodeId : created.config.messageNextNodeId,
      questionNextNodeId:
        type === "QUESTION" ? options.nextNodeId : created.config.questionNextNodeId,
      conditionFallbackNodeId:
        type === "CONDITION" ? options.nextNodeId : created.config.conditionFallbackNodeId,
    },
  };
  const nodes = withNode.nodes.map((node) => (node.id === created.id ? configured : node));
  const edges = [...withNode.edges];
  if (options.afterNodeId) {
    edges.push({
      id: `${options.afterNodeId}_to_${created.id}`,
      sourceNodeId: options.afterNodeId,
      sourceHandle: "next",
      targetNodeId: created.id,
      label: "Next",
      condition: null,
      sortOrder: edges.length + 1,
    });
  }
  if (options.nextNodeId) {
    edges.push({
      id: `${created.id}_to_${options.nextNodeId}`,
      sourceNodeId: created.id,
      sourceHandle: "next",
      targetNodeId: options.nextNodeId,
      label: "Next",
      condition: null,
      sortOrder: edges.length + 1,
    });
  }
  return { ...withNode, nodes, edges };
}

export function connectVisualNodes(
  visualFlow: VisualFlowDefinition,
  sourceNodeId: string,
  targetNodeId: string,
): VisualFlowDefinition {
  if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) return visualFlow;
  const exists = visualFlow.edges.some(
    (edge) => edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId,
  );
  if (exists) return visualFlow;
  const source = visualFlow.nodes.find((node) => node.id === sourceNodeId);
  const target = visualFlow.nodes.find((node) => node.id === targetNodeId);
  return {
    ...visualFlow,
    edges: [
      ...visualFlow.edges,
      {
        id: `${sourceNodeId}_to_${targetNodeId}`,
        sourceNodeId,
        sourceHandle: "next",
        targetNodeId,
        label: `${source?.title ?? sourceNodeId} to ${target?.title ?? targetNodeId}`,
        condition: null,
        sortOrder: visualFlow.edges.length + 1,
      },
    ],
  };
}

export function getEffectiveVisualEdges(visualFlow: VisualFlowDefinition): VisualFlowEdge[] {
  const generated = generatedEdgesFromNodeSettings(visualFlow);
  const generatedIds = new Set(generated.map((edge) => edge.id));
  const autoManagedSources = new Set(
    visualFlow.nodes
      .filter(
        (node) =>
          ["START", "MAIN_MENU", "QUESTION", "CONDITION"].includes(node.type) ||
          Boolean(node.config.menuOptions?.length) ||
          Boolean(node.config.messageBehavior),
      )
      .map((node) => node.id),
  );
  const manual = visualFlow.edges.filter(
    (edge) => !generatedIds.has(edge.id) && !autoManagedSources.has(edge.sourceNodeId),
  );
  return [...generated, ...manual].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function compileVisualFlowToRuntimeFlow(
  visualFlow: VisualFlowDefinition,
  baseFlow: FlowDefinition,
): VisualCompileResult {
  const normalizedVisualFlow = { ...visualFlow, edges: getEffectiveVisualEdges(visualFlow) };
  const visualValidation = validateVisualFlow(normalizedVisualFlow);
  if (!visualValidation.ok) return { ok: false, validation: visualValidation };

  const edgesBySource = new Map<string, VisualFlowEdge[]>();
  for (const edge of normalizedVisualFlow.edges) {
    edgesBySource.set(edge.sourceNodeId, [...(edgesBySource.get(edge.sourceNodeId) ?? []), edge]);
  }
  const nodes: FlowNode[] = normalizedVisualFlow.nodes.map((node) => {
    const type = visualTypeToRuntime(node.type);
    const firstEdge = edgesBySource.get(node.id)?.sort((a, b) => a.sortOrder - b.sortOrder)[0];
    return {
      id: node.id,
      type,
      messages: node.config.messages,
      labels: node.config.labels,
      next: firstEdge?.targetNodeId,
      protectedAction: protectedActions[type],
      optional: node.type === "HUMAN_HANDOFF" || node.type === "QUESTION",
    };
  });
  const runtimeEdges: FlowEdge[] = normalizedVisualFlow.edges.map((edge) => ({
    id: edge.id,
    from: edge.sourceNodeId,
    to: edge.targetNodeId,
    condition: edge.condition,
  }));
  const mainMenu = normalizedVisualFlow.nodes.find((node) => node.type === "MAIN_MENU");
  const storeInfo = normalizedVisualFlow.nodes.find((node) => node.type === "STORE_INFO");
  const handoff = normalizedVisualFlow.nodes.find((node) => node.type === "HUMAN_HANDOFF");
  const start =
    normalizedVisualFlow.nodes.find((node) => node.type === "START") ??
    normalizedVisualFlow.nodes[0];
  const questions = normalizedVisualFlow.nodes
    .filter((node) => node.type === "QUESTION" && node.config.question)
    .map((node) => node.config.question as FlowCustomQuestion);
  const mainMenuOptions = buildMainMenuOptions(mainMenu);
  const legacyOrderOption =
    mainMenuOptions.find((option) => option.key === "order") ?? mainMenuOptions[0];
  const legacyQuestionOption =
    mainMenuOptions.find((option) => option.key === "question") ?? mainMenuOptions[1];
  const legacyInfoOption =
    mainMenuOptions.find((option) => option.key === "info") ?? mainMenuOptions[2];
  const startBehavior = start?.config.startBehavior ?? "welcome_then_next";
  const welcomeCopy =
    startBehavior === "welcome_then_next"
      ? languageCopy(start?.config.messages, baseFlow.copy.welcome)
      : languageCopy(mainMenu?.config.messages ?? start?.config.messages, baseFlow.copy.welcome);
  const copy = {
    ...baseFlow.copy,
    welcome: welcomeCopy,
    orderButton: legacyOrderOption?.label ?? baseFlow.copy.orderButton,
    questionButton: legacyQuestionOption?.label ?? baseFlow.copy.questionButton,
    infoButton: legacyInfoOption?.label ?? baseFlow.copy.infoButton,
    infoResponse: languageCopy(storeInfo?.config.messages, baseFlow.copy.infoResponse),
  };
  const flow: FlowDefinition = {
    ...baseFlow,
    name: visualFlow.metadata.name || baseFlow.name,
    supportedLanguages: visualFlow.metadata.languageSupport,
    startNodeId: start.id,
    nodes,
    edges: runtimeEdges,
    copy,
    settings: {
      ...baseFlow.settings,
      defaultLanguage: visualFlow.metadata.defaultLanguage,
      languageSelectionEnabled: startBehavior === "language_first",
      allowHumanHandoff: Boolean(handoff) || baseFlow.settings.allowHumanHandoff,
    },
    editor: {
      ...baseFlow.editor,
      mainMenuOptions,
      customQuestions: questions,
      humanHandoff: handoff
        ? {
            enabled: true,
            label: languageCopy(handoff.config.labels, {
              en: "Human support",
              ar: "دعم بشري",
            }),
            response: languageCopy(
              handoff.config.messages,
              baseFlow.editor?.humanHandoff?.response ?? {
                en: "A team member will help you shortly.",
                ar: "سيساعدك أحد أعضاء الفريق قريباً.",
              },
            ),
            maxInvalidAttempts: baseFlow.editor?.humanHandoff?.maxInvalidAttempts ?? 3,
            ownerSupportNote: baseFlow.editor?.humanHandoff?.ownerSupportNote ?? "",
          }
        : baseFlow.editor?.humanHandoff,
    },
    visualFlow: normalizedVisualFlow,
    compiledRuntimeFlowJson: {
      nodes,
      edges: runtimeEdges,
      copy,
      settings: baseFlow.settings,
    },
  };
  const runtimeValidation = validateFlowForEditor(flow);
  return { ok: runtimeValidation.ok, flow, validation: runtimeValidation };
}

export function validateVisualFlow(visualFlow: VisualFlowDefinition): FlowValidationResult {
  const issues: FlowValidationIssue[] = [];
  const effectiveEdges = getEffectiveVisualEdges(visualFlow);
  const startNodes = visualFlow.nodes.filter((node) => node.type === "START");
  if (startNodes.length === 0) issues.push(error("VISUAL_START_REQUIRED", "Add one START block."));
  if (startNodes.length > 1)
    issues.push(error("VISUAL_START_UNIQUE", "Only one START block is allowed."));
  const ids = new Set(visualFlow.nodes.map((node) => node.id));
  for (const edge of effectiveEdges) {
    if (!ids.has(edge.sourceNodeId))
      issues.push(error("VISUAL_EDGE_SOURCE", "Edge source is missing."));
    if (!ids.has(edge.targetNodeId))
      issues.push(error("VISUAL_EDGE_TARGET", "Edge target is missing."));
  }
  const reachable = reachableVisualNodes(startNodes[0]?.id, effectiveEdges);
  const startHasTarget = startNodes[0]
    ? effectiveEdges.some((edge) => edge.sourceNodeId === startNodes[0].id)
    : false;
  if (startNodes[0] && !startHasTarget) {
    issues.push(
      error(
        "VISUAL_ENTRY_NEXT_REQUIRED",
        "Entry point needs a first step. Choose the first customer experience in Entry point settings.",
      ),
    );
  }
  for (const node of visualFlow.nodes) {
    if (startNodes.length && !reachable.has(node.id)) {
      issues.push(
        warning(
          "VISUAL_UNREACHABLE",
          `${friendlyValidationStepName(node)} is not reachable from Entry point.`,
        ),
      );
    }
    const outgoing = effectiveEdges.some((edge) => edge.sourceNodeId === node.id);
    if (!outgoing && node.type !== "END") {
      issues.push(
        warning(
          "VISUAL_DEAD_END",
          `${friendlyValidationStepName(node)} has no next step. Choose what happens after this step.`,
        ),
      );
    }
    if (node.type === "MAIN_MENU") {
      const options = node.config.menuOptions ?? [];
      const activeOptions = options.filter((option) => option.active !== false);
      if (!activeOptions.length)
        issues.push(error("VISUAL_MENU_OPTIONS", "Main menu needs at least one active option."));
      const optionKeys = activeOptions.map((option) => (option.key || "").trim().toLowerCase());
      if (new Set(optionKeys).size !== optionKeys.length) {
        issues.push(error("VISUAL_MENU_KEY_DUPLICATE", "Main menu option keys must be unique."));
      }
      for (const duplicate of duplicateOptionLabels(activeOptions)) {
        issues.push(error("VISUAL_MENU_LABEL_DUPLICATE", duplicate));
      }
      for (const option of options) {
        if (option.active === false) continue;
        if (!option.label.en.trim()) {
          issues.push(error("VISUAL_MENU_LABEL", "Main menu option needs an English label."));
        }
        if (!option.targetNodeId) {
          issues.push(
            warning("VISUAL_MENU_TARGET", `${node.title} has an option without a target.`),
          );
        }
      }
    }
    if (node.config.messageBehavior === "options") validateOptionsNode(node, issues);
    if (node.type === "QUESTION") validateQuestionNode(node, issues);
    if (node.type === "CONDITION") {
      const rules = node.config.conditionRules ?? [];
      if (!node.config.conditionSource?.trim()) {
        issues.push(error("VISUAL_CONDITION_SOURCE", `${node.title} needs a condition source.`));
      }
      if (!rules.length) {
        issues.push(error("VISUAL_CONDITION_RULES", `${node.title} needs at least one rule.`));
      }
    }
    if (node.type === "HUMAN_HANDOFF" && !node.config.messages?.en?.trim()) {
      issues.push(error("VISUAL_HANDOFF_MESSAGE", "Handoff needs an English response."));
    }
  }
  return {
    ok: !issues.some((issue) => issue.severity === "ERROR"),
    issues,
  };
}

function configFromRuntimeNode(flow: FlowDefinition, node: FlowNode): VisualFlowNode["config"] {
  if (node.type === "MAIN_MENU") {
    const nodeIds = new Set(flow.nodes.map((entry) => entry.id));
    const targetByCondition = new Map(
      flow.edges
        .filter((edgeEntry) => edgeEntry.from === node.id)
        .map((edgeEntry) => [edgeEntry.condition, edgeEntry.to]),
    );
    return {
      messages: flow.copy.welcome,
      menuOptions: [
        {
          key: "order",
          action: "PLACE_ORDER",
          label: flow.copy.orderButton,
          targetNodeId: targetByCondition.get("order"),
          active: true,
        },
        {
          key: "question",
          action: "ASK_QUESTION",
          label: flow.copy.questionButton,
          targetNodeId:
            targetByCondition.get("question") ??
            (nodeIds.has("human_handoff")
              ? "human_handoff"
              : targetByCondition.get("question_or_info")),
          active: true,
        },
        {
          key: "info",
          action: "STORE_INFO",
          label: flow.copy.infoButton,
          targetNodeId:
            targetByCondition.get("info") ??
            (nodeIds.has("store_info") ? "store_info" : targetByCondition.get("question_or_info")),
          active: true,
        },
      ],
    };
  }
  if (node.id === "start") {
    const firstEdge = flow.edges.find((edgeEntry) => edgeEntry.from === node.id);
    const targetType = flow.nodes.find((entry) => entry.id === firstEdge?.to)?.type;
    return {
      messages: flow.copy.welcome,
      startBehavior:
        targetType === "LANGUAGE_SELECT"
          ? "language_first"
          : targetType === "MAIN_MENU"
            ? "main_menu"
            : firstEdge?.to
              ? "custom_step"
              : "welcome_then_next",
      messageNextNodeId: firstEdge?.to,
    };
  }
  if (node.type === "HUMAN_HANDOFF") {
    return {
      messages: flow.editor?.humanHandoff?.response ?? {
        en: "A team member will help you shortly.",
        ar: "سيساعدك أحد أعضاء الفريق قريباً.",
      },
      labels: flow.editor?.humanHandoff?.label ?? { en: "Human support", ar: "دعم بشري" },
      handoff: {
        pauseBot: true,
        ownerAlert: true,
        returnBehavior: "stay_paused",
      },
    };
  }
  return { messages: node.messages, labels: node.labels };
}

function defaultConfig(type: VisualFlowBlockType): VisualFlowNode["config"] {
  if (type === "MAIN_MENU") {
    return {
      messages: { en: "How can we help?", ar: "كيف يمكننا مساعدتك؟" },
      menuOptions: [
        {
          key: "order",
          action: "PLACE_ORDER",
          label: { en: "Place an order", ar: "تقديم طلب" },
          active: true,
        },
        {
          key: "question",
          action: "ASK_QUESTION",
          label: { en: "Ask a question", ar: "طرح سؤال" },
          active: true,
        },
        {
          key: "info",
          action: "STORE_INFO",
          label: { en: "Store information", ar: "معلومات المتجر" },
          active: true,
        },
      ],
    };
  }
  if (type === "START") {
    return {
      messages: { en: "How can we help?", ar: "كيف يمكننا مساعدتك؟" },
      startBehavior: "language_first",
    };
  }
  if (type === "SEND_MESSAGE") {
    return {
      messages: { en: "Write the message customers will see.", ar: "" },
      messageBehavior: "next",
    };
  }
  if (type === "QUESTION") {
    return {
      question: {
        key: "custom_question",
        type: "short_text",
        label: { en: "Custom question", ar: "سؤال مخصص" },
        helpText: { en: "", ar: "" },
        required: false,
        active: true,
        sortOrder: 1,
        choices: [],
      },
      questionSaveTo: "order",
    };
  }
  if (type === "CONDITION") {
    return {
      conditionSource: "customer.language",
      conditionRules: [
        {
          id: "rule_1",
          operator: "equals",
          value: "en",
        },
      ],
    };
  }
  if (type === "HUMAN_HANDOFF") {
    return {
      labels: { en: "Human support", ar: "دعم بشري" },
      messages: {
        en: "A team member will help you shortly.",
        ar: "سيساعدك أحد أعضاء الفريق قريباً.",
      },
      handoff: {
        pauseBot: true,
        ownerAlert: true,
        returnBehavior: "stay_paused",
      },
    };
  }
  if (type === "STORE_INFO") {
    return {
      messages: {
        en: "We are open daily. Send a message here if you need help.",
        ar: "نحن متاحون يومياً. أرسل رسالة هنا إذا احتجت مساعدة.",
      },
    };
  }
  return { messages: { en: visualTitle(type), ar: "" } };
}

function validateQuestionNode(node: VisualFlowNode, issues: FlowValidationIssue[]) {
  const question = node.config.question;
  if (!question) {
    issues.push(error("VISUAL_QUESTION_CONFIG", `${node.title} needs question settings.`));
    return;
  }
  if (!/^[a-z][a-z0-9_]{1,40}$/.test(question.key)) {
    issues.push(error("VISUAL_QUESTION_KEY", `${node.title} has an invalid question key.`));
  }
  if (!question.label.en.trim()) {
    issues.push(
      error("VISUAL_QUESTION_LABEL", `${friendlyValidationStepName(node)} needs question text.`),
    );
  }
  if (!node.config.questionNextNodeId) {
    issues.push(
      error(
        "VISUAL_QUESTION_NEXT",
        `${friendlyValidationStepName(node)} needs a next step after the customer answers.`,
      ),
    );
  }
  if (question.type === "single_choice") {
    const activeChoices = (question.choices ?? []).filter((choice) => choice.active !== false);
    if (activeChoices.length < 2) {
      issues.push(
        error(
          "VISUAL_QUESTION_CHOICES",
          `${friendlyValidationStepName(node)} needs at least two active choices.`,
        ),
      );
    }
    const choiceKeys = activeChoices.map((choice) => choice.value.trim().toLowerCase());
    if (new Set(choiceKeys).size !== choiceKeys.length) {
      issues.push(
        error(
          "VISUAL_QUESTION_CHOICE_DUPLICATE",
          `${friendlyValidationStepName(node)} has duplicate choice keys.`,
        ),
      );
    }
  }
}

function validateOptionsNode(node: VisualFlowNode, issues: FlowValidationIssue[]) {
  const options = (node.config.menuOptions ?? []).filter((option) => option.active !== false);
  if (!options.length) {
    issues.push(
      error("VISUAL_OPTIONS_REQUIRED", `${friendlyValidationStepName(node)} needs active options.`),
    );
  }
  const keys = options.map((option) => (option.key || "").trim().toLowerCase());
  if (new Set(keys).size !== keys.length) {
    issues.push(
      error(
        "VISUAL_OPTIONS_KEY_DUPLICATE",
        `${friendlyValidationStepName(node)} has duplicate option keys.`,
      ),
    );
  }
  for (const duplicate of duplicateOptionLabels(options, friendlyValidationStepName(node))) {
    issues.push(error("VISUAL_OPTIONS_LABEL_DUPLICATE", duplicate));
  }
  for (const option of options) {
    if (!option.label.en.trim()) {
      issues.push(
        error(
          "VISUAL_OPTIONS_LABEL",
          `${friendlyValidationStepName(node)} has an option without an English label.`,
        ),
      );
    }
    if (!option.targetNodeId) {
      issues.push(
        error(
          "VISUAL_OPTIONS_TARGET",
          `${friendlyValidationStepName(node)} has an option without a target step.`,
        ),
      );
    }
  }
}

function duplicateOptionLabels(
  options: NonNullable<VisualFlowNode["config"]["menuOptions"]>,
  blockName = "Main menu",
) {
  const messages: string[] = [];
  const languages = ["en", "ar"] as const;
  for (const language of languages) {
    const seen = new Map<string, number[]>();
    options.forEach((option, index) => {
      const label = option.label[language]?.trim();
      if (!label) return;
      const key = label.toLowerCase();
      seen.set(key, [...(seen.get(key) ?? []), index + 1]);
    });
    for (const [normalizedLabel, optionNumbers] of seen) {
      if (optionNumbers.length < 2) continue;
      const label = options[optionNumbers[0] - 1]?.label[language]?.trim() || normalizedLabel;
      messages.push(
        `${blockName} has duplicate ${language.toUpperCase()} WhatsApp option label "${label}" in options ${optionNumbers.join(", ")}. Rename or delete one of them.`,
      );
    }
  }
  return messages;
}

function buildMainMenuOptions(mainMenu: VisualFlowNode | undefined): FlowMainMenuOption[] {
  return (mainMenu?.config.menuOptions ?? [])
    .filter((option) => option.active !== false)
    .map((option, index) => ({
      key: option.key || option.action?.toLowerCase() || `option_${index + 1}`,
      label: option.label,
      targetNodeId: option.targetNodeId,
      active: true,
      sortOrder: index + 1,
    }));
}

function generatedEdgesFromNodeSettings(visualFlow: VisualFlowDefinition): VisualFlowEdge[] {
  const edges: VisualFlowEdge[] = [];
  let sortOrder = 1;
  for (const node of visualFlow.nodes) {
    if (node.type === "START") {
      const target =
        node.config.startBehavior === "language_first"
          ? visualFlow.nodes.find((entry) => entry.type === "LANGUAGE_SELECTION")?.id
          : node.config.startBehavior === "main_menu"
            ? visualFlow.nodes.find((entry) => entry.type === "MAIN_MENU")?.id
            : node.config.messageNextNodeId;
      if (target) {
        edges.push({
          id: `${node.id}_entry_to_${target}`,
          sourceNodeId: node.id,
          sourceHandle: "entry",
          targetNodeId: target,
          label: "First step",
          condition: null,
          sortOrder: sortOrder++,
        });
      }
    } else if (
      node.config.menuOptions?.length &&
      (node.type === "MAIN_MENU" || node.config.messageBehavior === "options")
    ) {
      for (const option of node.config.menuOptions ?? []) {
        if (option.active === false || !option.targetNodeId) continue;
        const key = option.key || option.action || `option_${sortOrder}`;
        edges.push({
          id: `${node.id}_option_${key}_to_${option.targetNodeId}`,
          sourceNodeId: node.id,
          sourceHandle: key,
          targetNodeId: option.targetNodeId,
          label: option.label.en || key,
          condition: key,
          sortOrder: sortOrder++,
        });
      }
      if (node.config.messageFallbackNodeId) {
        edges.push({
          id: `${node.id}_fallback_to_${node.config.messageFallbackNodeId}`,
          sourceNodeId: node.id,
          sourceHandle: "fallback",
          targetNodeId: node.config.messageFallbackNodeId,
          label: "Fallback",
          condition: "fallback",
          sortOrder: sortOrder++,
        });
      }
    } else if (node.config.messageBehavior) {
      const target =
        node.config.messageBehavior === "next"
          ? node.config.messageNextNodeId
          : node.config.messageBehavior === "main_menu"
            ? visualFlow.nodes.find((entry) => entry.type === "MAIN_MENU")?.id
            : node.config.messageBehavior === "handoff"
              ? visualFlow.nodes.find((entry) => entry.type === "HUMAN_HANDOFF")?.id
              : node.config.messageBehavior === "end"
                ? visualFlow.nodes.find((entry) => entry.type === "END")?.id
                : undefined;
      if (target) {
        edges.push({
          id: `${node.id}_${node.config.messageBehavior}_to_${target}`,
          sourceNodeId: node.id,
          sourceHandle: node.config.messageBehavior,
          targetNodeId: target,
          label: "After message",
          condition: node.config.messageBehavior,
          sortOrder: sortOrder++,
        });
      }
    } else if (node.type === "QUESTION") {
      if (node.config.question?.type === "single_choice") {
        for (const choice of node.config.question.choices ?? []) {
          if (choice.active === false || !choice.targetNodeId) continue;
          edges.push({
            id: `${node.id}_choice_${choice.value}_to_${choice.targetNodeId}`,
            sourceNodeId: node.id,
            sourceHandle: choice.value,
            targetNodeId: choice.targetNodeId,
            label: choice.label.en || choice.value,
            condition: choice.value,
            sortOrder: sortOrder++,
          });
        }
      }
      if (node.config.questionNextNodeId) {
        edges.push({
          id: `${node.id}_answer_to_${node.config.questionNextNodeId}`,
          sourceNodeId: node.id,
          sourceHandle: "answer",
          targetNodeId: node.config.questionNextNodeId,
          label: "After answer",
          condition: "answer",
          sortOrder: sortOrder++,
        });
      }
      if (node.config.questionFallbackNodeId) {
        edges.push({
          id: `${node.id}_fallback_to_${node.config.questionFallbackNodeId}`,
          sourceNodeId: node.id,
          sourceHandle: "fallback",
          targetNodeId: node.config.questionFallbackNodeId,
          label: "Fallback",
          condition: "fallback",
          sortOrder: sortOrder++,
        });
      }
    } else if (node.type === "CONDITION") {
      for (const rule of node.config.conditionRules ?? []) {
        if (!rule.targetNodeId) continue;
        edges.push({
          id: `${node.id}_${rule.id}_to_${rule.targetNodeId}`,
          sourceNodeId: node.id,
          sourceHandle: rule.id,
          targetNodeId: rule.targetNodeId,
          label: `${rule.operator} ${rule.value}`.trim(),
          condition:
            `${node.config.conditionSource ?? "value"} ${rule.operator} ${rule.value}`.trim(),
          sortOrder: sortOrder++,
        });
      }
      if (node.config.conditionFallbackNodeId) {
        edges.push({
          id: `${node.id}_fallback_to_${node.config.conditionFallbackNodeId}`,
          sourceNodeId: node.id,
          sourceHandle: "fallback",
          targetNodeId: node.config.conditionFallbackNodeId,
          label: "Fallback",
          condition: "fallback",
          sortOrder: sortOrder++,
        });
      }
    }
  }
  return edges;
}

function reachableVisualNodes(startId: string | undefined, edges: VisualFlowEdge[]) {
  const reachable = new Set<string>();
  if (!startId) return reachable;
  const queue = [startId];
  while (queue.length) {
    const current = queue.shift();
    if (!current || reachable.has(current)) continue;
    reachable.add(current);
    for (const edge of edges.filter((entry) => entry.sourceNodeId === current)) {
      queue.push(edge.targetNodeId);
    }
  }
  return reachable;
}

function runtimeTypeToVisual(type: FlowNodeType, id: string): VisualFlowBlockType {
  if (id === "start") return "START";
  if (type === "LANGUAGE_SELECT") return "LANGUAGE_SELECTION";
  if (type === "MAIN_MENU") return "MAIN_MENU";
  if (type === "CATEGORY_SELECT") return "CATEGORY_SELECTION";
  if (type === "PRODUCT_SELECT") return "PRODUCT_SELECTION";
  if (type === "PRODUCT_DETAILS") return "PRODUCT_DETAILS";
  if (type === "CART_MENU") return "CART_REVIEW";
  if (type === "CHECKOUT") return "CHECKOUT_FULFILLMENT";
  if (type === "ORDER_REVIEW") return "ORDER_REVIEW";
  if (type === "ORDER_CONFIRMATION") return "ORDER_CONFIRMATION";
  if (type === "HUMAN_HANDOFF") return "HUMAN_HANDOFF";
  if (type === "END") return "END";
  return "SEND_MESSAGE";
}

function visualTypeToRuntime(type: VisualFlowBlockType): FlowNodeType {
  if (type === "LANGUAGE_SELECTION") return "LANGUAGE_SELECT";
  if (type === "MAIN_MENU") return "MAIN_MENU";
  if (type === "CATEGORY_SELECTION") return "CATEGORY_SELECT";
  if (type === "PRODUCT_SELECTION") return "PRODUCT_SELECT";
  if (type === "PRODUCT_DETAILS") return "PRODUCT_DETAILS";
  if (type === "QUESTION") return "CUSTOM_FIELDS";
  if (type === "CART_REVIEW") return "CART_MENU";
  if (type.startsWith("CHECKOUT_")) return "CHECKOUT";
  if (type === "ORDER_REVIEW") return "ORDER_REVIEW";
  if (type === "ORDER_CONFIRMATION") return "ORDER_CONFIRMATION";
  if (type === "HUMAN_HANDOFF") return "HUMAN_HANDOFF";
  if (type === "END") return "END";
  return "MESSAGE";
}

function visualTitle(type: VisualFlowBlockType) {
  return visualBlockPalette.find((block) => block.type === type)?.title ?? type;
}

function friendlyValidationStepName(node: VisualFlowNode) {
  return node.title || visualTitle(node.type);
}

function languageCopy(
  value: Partial<Record<FlowLanguage, string>> | undefined,
  fallback: Record<FlowLanguage, string>,
): Record<FlowLanguage, string> {
  return {
    en: value?.en ?? fallback.en,
    ar: value?.ar ?? fallback.ar,
  };
}

function isVisualFlow(value: unknown): value is VisualFlowDefinition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<VisualFlowDefinition>;
  return (
    candidate.version === 1 && Array.isArray(candidate.nodes) && Array.isArray(candidate.edges)
  );
}

function error(code: string, message: string): FlowValidationIssue {
  return { code, message, severity: "ERROR" };
}

function warning(code: string, message: string): FlowValidationIssue {
  return { code, message, severity: "WARNING" };
}
