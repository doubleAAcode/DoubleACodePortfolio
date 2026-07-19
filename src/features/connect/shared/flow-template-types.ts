import type { BotFlowSettingsInput } from "./bot-flow-settings.server";

export type FlowTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type FlowCategory =
  | "ECOMMERCE"
  | "RESTAURANT"
  | "GREETING_STORE_INFO"
  | "STANDARD_ONLINE_STORE"
  | "JEWELRY"
  | "CLOTHING"
  | "ACCESSORIES"
  | "CUSTOM_PRODUCTS";

export type AdminFlowActionType =
  | "text_message"
  | "image_message"
  | "options_menu"
  | "catalog_browse"
  | "product_purchase"
  | "human_handoff"
  | "end"
  | "return_to_menu";

export type FlowNodeType =
  | "MESSAGE"
  | "IMAGE_MESSAGE"
  | "LANGUAGE_SELECT"
  | "MAIN_MENU"
  | "CATEGORY_SELECT"
  | "PRODUCT_SELECT"
  | "PRODUCT_DETAILS"
  | "PRODUCT_OPTIONS"
  | "CUSTOM_FIELDS"
  | "QUANTITY"
  | "CART_MENU"
  | "CHECKOUT"
  | "ORDER_REVIEW"
  | "ORDER_CONFIRMATION"
  | "HUMAN_HANDOFF"
  | "END";

export type FlowLanguage = "en" | "ar";

export type FlowNodeOption = {
  key: string;
  label: Partial<Record<FlowLanguage, string>>;
  targetNodeId?: string;
  active?: boolean;
  sortOrder?: number;
};

export type FlowNode = {
  id: string;
  type: FlowNodeType;
  messages?: Partial<Record<FlowLanguage, string>>;
  labels?: Partial<Record<FlowLanguage, string>>;
  mediaUrl?: string;
  mediaCaption?: Partial<Record<FlowLanguage, string>>;
  options?: FlowNodeOption[];
  next?: string;
  protectedAction?: string;
  optional?: boolean;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  condition?: string | null;
};

export type FlowDefinition = {
  id: string;
  name: string;
  description?: string;
  canonicalDocument?: unknown;
  visualFlow?: unknown;
  compiledRuntimeFlowJson?: unknown;
  startNodeId: string;
  supportedLanguages: FlowLanguage[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  settings: {
    allowHumanHandoff: boolean;
    allowRestart: boolean;
    allowBack: boolean;
    languageSelectionEnabled: boolean;
    defaultLanguage: FlowLanguage;
    orderNotesEnabled: boolean;
    showProductDetailsBeforeOrdering: boolean;
    autoUseSavedCheckoutDetails: boolean;
    skipFulfillmentWhenSingleOption: boolean;
    skipDeliveryAreaWhenSingleOption: boolean;
    skipPickupLocationWhenSingleOption: boolean;
    skipPaymentWhenSingleOption: boolean;
    allowDelivery: boolean;
    allowPickup: boolean;
  };
  copy: {
    welcome: Record<FlowLanguage, string>;
    orderButton: Record<FlowLanguage, string>;
    questionButton: Record<FlowLanguage, string>;
    questionResponse: Record<FlowLanguage, string>;
    infoButton: Record<FlowLanguage, string>;
    infoResponse: Record<FlowLanguage, string>;
    customerNamePrompt: Record<FlowLanguage, string>;
    fulfillmentPrompt: Record<FlowLanguage, string>;
    deliveryAreaPrompt: Record<FlowLanguage, string>;
    pickupLocationPrompt: Record<FlowLanguage, string>;
    deliveryAddressPrompt: Record<FlowLanguage, string>;
    paymentMethodPrompt: Record<FlowLanguage, string>;
    orderNotesPrompt: Record<FlowLanguage, string>;
    noNotesButton: Record<FlowLanguage, string>;
  };
  editor?: FlowEditorConfig;
};

export type FlowQuestionType = "short_text" | "long_text" | "number" | "yes_no" | "single_choice";

export type FlowCustomQuestion = {
  key: string;
  type: FlowQuestionType;
  label: Record<FlowLanguage, string>;
  helpText: Record<FlowLanguage, string>;
  required: boolean;
  active: boolean;
  sortOrder: number;
  minLength?: number | null;
  maxLength?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  choices?: Array<{
    value: string;
    label: Record<FlowLanguage, string>;
    targetNodeId?: string;
    active?: boolean;
  }>;
};

export type FlowMainMenuOption = {
  key: string;
  label: Record<FlowLanguage, string>;
  targetNodeId?: string;
  response?: Partial<Record<FlowLanguage, string>>;
  active: boolean;
  sortOrder: number;
};

export type FlowBrowseRoute = {
  key: string;
  source: "categories" | "catalog_group";
  label: Record<FlowLanguage, string>;
  groupSlug?: string;
  active: boolean;
  sortOrder: number;
};

export type FlowEditorConfig = {
  commands?: {
    allowMenu: boolean;
    allowCart: boolean;
  };
  mainMenuOptions?: FlowMainMenuOption[];
  browseRoutes?: FlowBrowseRoute[];
  storeInfo?: {
    openingHours: string;
    location: string;
    contact: string;
  };
  ordering?: {
    showProductCode: boolean;
    showProductDescription: boolean;
    showProductPrice: boolean;
    allowProductCodeLookup: boolean;
    showUnavailableProducts: boolean;
    allowUnavailableOrdering: boolean;
    showProductImage: boolean;
    quantityQuickButtons: boolean;
    allowAddAnotherItem: boolean;
    allowViewCart: boolean;
  };
  checkout?: {
    askCustomerName: boolean;
    askAlternatePhone: boolean;
    askFulfillmentChoice: boolean;
    askNotes: boolean;
    showFinalReview: boolean;
    requireFinalConfirmation: boolean;
  };
  humanHandoff?: {
    enabled: boolean;
    label: Record<FlowLanguage, string>;
    response: Record<FlowLanguage, string>;
    maxInvalidAttempts: number;
    ownerSupportNote: string;
  };
  customQuestions?: FlowCustomQuestion[];
};

export type FlowValidationIssue = {
  code: string;
  message: string;
  severity: "ERROR" | "WARNING";
  nodeId?: string;
  edgeId?: string;
  path?: string;
  suggestedFix?: string;
  phase?: "structural" | "draft" | "publish" | "runtime";
};

export type FlowValidationResult = {
  ok: boolean;
  issues: FlowValidationIssue[];
};

const supportedNodeTypes: ReadonlySet<FlowNodeType> = new Set([
  "MESSAGE",
  "IMAGE_MESSAGE",
  "LANGUAGE_SELECT",
  "MAIN_MENU",
  "CATEGORY_SELECT",
  "PRODUCT_SELECT",
  "PRODUCT_DETAILS",
  "PRODUCT_OPTIONS",
  "CUSTOM_FIELDS",
  "QUANTITY",
  "CART_MENU",
  "CHECKOUT",
  "ORDER_REVIEW",
  "ORDER_CONFIRMATION",
  "HUMAN_HANDOFF",
  "END",
]);

const requiredProtectedActions: Partial<Record<FlowNodeType, string>> = {
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

const maxWhatsAppButtonLength = 20;
const maxWhatsAppListTitleLength = 24;

export function createDefaultFlowDefinition(category: FlowCategory): FlowDefinition {
  const variant = templateVariant(category);
  const id = variant.id;
  const settings: FlowDefinition["settings"] = {
    allowHumanHandoff: true,
    allowRestart: true,
    allowBack: true,
    languageSelectionEnabled: true,
    defaultLanguage: "en",
    orderNotesEnabled: true,
    showProductDetailsBeforeOrdering: true,
    autoUseSavedCheckoutDetails: false,
    skipFulfillmentWhenSingleOption: true,
    skipDeliveryAreaWhenSingleOption: true,
    skipPickupLocationWhenSingleOption: true,
    skipPaymentWhenSingleOption: true,
    allowDelivery: true,
    allowPickup: true,
  };
  const copyBlock: FlowDefinition["copy"] = {
    welcome: variant.welcome,
    orderButton: variant.orderButton,
    questionButton: { en: "Ask a question", ar: "\u0637\u0631\u062d \u0633\u0624\u0627\u0644" },
    questionResponse: {
      en: "Send us your question here and our team will reply shortly.",
      ar: "\u0627\u0631\u0633\u0644 \u0633\u0624\u0627\u0644\u0643 \u0647\u0646\u0627 \u0648\u0633\u064a\u0631\u062f \u0641\u0631\u064a\u0642\u0646\u0627 \u0642\u0631\u064a\u0628\u0627.",
    },
    infoButton: {
      en: "Store information",
      ar: "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631",
    },
    infoResponse: {
      en: variant.infoResponse,
      ar: "\u0646\u062d\u0646 \u0645\u062a\u0627\u062d\u0648\u0646 \u064a\u0648\u0645\u064a\u0627. \u0627\u0631\u0633\u0644 \u0631\u0633\u0627\u0644\u0629 \u0647\u0646\u0627 \u0625\u0630\u0627 \u0627\u062d\u062a\u062c\u062a \u0645\u0633\u0627\u0639\u062f\u0629.",
    },
    customerNamePrompt: {
      en: "What name should we put on the order?",
      ar: "\u0645\u0627 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0630\u064a \u0646\u0636\u0639\u0647 \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628\u061f",
    },
    fulfillmentPrompt: {
      en: "How would you like to receive your order?",
      ar: "\u0643\u064a\u0641 \u062a\u0631\u064a\u062f \u0627\u0633\u062a\u0644\u0627\u0645 \u0637\u0644\u0628\u0643\u061f",
    },
    deliveryAreaPrompt: {
      en: "Choose your delivery area:",
      ar: "\u0627\u062e\u062a\u0631 \u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644:",
    },
    pickupLocationPrompt: {
      en: "Choose a pickup location:",
      ar: "\u0627\u062e\u062a\u0631 \u0645\u0643\u0627\u0646 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645:",
    },
    deliveryAddressPrompt: {
      en: "Send the full delivery address. You can also send a WhatsApp location.",
      ar: "\u0623\u0631\u0633\u0644 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0627\u0644\u0643\u0627\u0645\u0644. \u064a\u0645\u0643\u0646\u0643 \u0623\u064a\u0636\u0627 \u0625\u0631\u0633\u0627\u0644 \u0645\u0648\u0642\u0639 \u0648\u0627\u062a\u0633\u0627\u0628.",
    },
    paymentMethodPrompt: {
      en: "Choose a payment method:",
      ar: "\u0627\u062e\u062a\u0631 \u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639:",
    },
    orderNotesPrompt: {
      en: variant.notesPrompt,
      ar: "\u0647\u0644 \u062a\u0631\u064a\u062f \u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0627\u062d\u0638\u0627\u062a\u061f",
    },
    noNotesButton: {
      en: "No notes",
      ar: "\u0628\u062f\u0648\u0646 \u0645\u0644\u0627\u062d\u0638\u0627\u062a",
    },
  };
  if (category === "GREETING_STORE_INFO") {
    return {
      id,
      name: variant.name,
      startNodeId: "start",
      supportedLanguages: ["en", "ar"],
      nodes: [
        {
          id: "start",
          type: "MAIN_MENU",
          messages: variant.welcome,
          next: "store_info",
          options: [
            {
              key: "store_info",
              label: variant.orderButton,
              targetNodeId: "store_info",
              active: true,
              sortOrder: 1,
            },
            {
              key: "support",
              label: copyBlock.questionButton,
              targetNodeId: "human_handoff",
              active: true,
              sortOrder: 2,
            },
          ],
        },
        {
          id: "store_info",
          type: "MESSAGE",
          messages: copyBlock.infoResponse,
        },
        {
          id: "human_handoff",
          type: "HUMAN_HANDOFF",
          messages: copyBlock.questionResponse,
          optional: true,
        },
      ],
      edges: [edge("start", "store_info", "store_info"), edge("start", "human_handoff", "support")],
      settings: {
        ...settings,
        languageSelectionEnabled: false,
        orderNotesEnabled: false,
        showProductDetailsBeforeOrdering: false,
        allowDelivery: false,
        allowPickup: false,
      },
      copy: copyBlock,
      editor: {
        mainMenuOptions: [
          {
            key: "store_info",
            label: variant.orderButton,
            targetNodeId: "store_info",
            active: true,
            sortOrder: 1,
          },
          {
            key: "support",
            label: copyBlock.questionButton,
            targetNodeId: "human_handoff",
            active: true,
            sortOrder: 2,
          },
        ],
      },
    };
  }
  return {
    id,
    name: variant.name,
    startNodeId: "start",
    supportedLanguages: ["en", "ar"],
    nodes: [
      {
        id: "start",
        type: "MESSAGE",
        messages: variant.welcome,
        next: "select_language",
      },
      { id: "select_language", type: "LANGUAGE_SELECT", next: "main_menu" },
      {
        id: "main_menu",
        type: "MAIN_MENU",
        messages: variant.welcome,
        options: [
          {
            key: "order",
            label: copyBlock.orderButton,
            targetNodeId: "category_select",
            active: true,
            sortOrder: 1,
          },
          {
            key: "question",
            label: copyBlock.questionButton,
            targetNodeId: "human_handoff",
            active: true,
            sortOrder: 2,
          },
          {
            key: "info",
            label: copyBlock.infoButton,
            targetNodeId: "store_info",
            active: true,
            sortOrder: 3,
          },
        ],
        next: "category_select",
      },
      {
        id: "store_info",
        type: "MESSAGE",
        messages: copyBlock.infoResponse,
        optional: true,
        next: "main_menu",
      },
      {
        id: "category_select",
        type: "CATEGORY_SELECT",
        next: "product_select",
        protectedAction: "catalog.categories",
      },
      {
        id: "product_select",
        type: "PRODUCT_SELECT",
        next: "product_details",
        protectedAction: "catalog.products",
      },
      { id: "product_details", type: "PRODUCT_DETAILS", next: "product_options" },
      {
        id: "product_options",
        type: "PRODUCT_OPTIONS",
        next: "custom_fields",
        protectedAction: "catalog.options",
      },
      {
        id: "custom_fields",
        type: "CUSTOM_FIELDS",
        next: "quantity",
        protectedAction: "catalog.custom_fields",
      },
      {
        id: "quantity",
        type: "QUANTITY",
        next: "cart_menu",
        protectedAction: "cart.validate_quantity",
      },
      { id: "cart_menu", type: "CART_MENU", next: "checkout", protectedAction: "cart.service" },
      {
        id: "checkout",
        type: "CHECKOUT",
        next: "order_review",
        protectedAction: "checkout.service",
      },
      {
        id: "order_review",
        type: "ORDER_REVIEW",
        next: "order_confirmation",
        protectedAction: "order.review",
      },
      {
        id: "order_confirmation",
        type: "ORDER_CONFIRMATION",
        next: "end",
        protectedAction: "order.create_pending",
      },
      {
        id: "human_handoff",
        type: "HUMAN_HANDOFF",
        messages: copyBlock.questionResponse,
        optional: true,
        next: "end",
      },
      { id: "end", type: "END" },
    ],
    edges: [
      edge("start", "select_language"),
      edge("select_language", "main_menu"),
      edge("main_menu", "category_select", "order"),
      edge("main_menu", "human_handoff", "question"),
      edge("main_menu", "store_info", "info"),
      edge("store_info", "main_menu"),
      edge("category_select", "product_select"),
      edge("product_select", "product_details"),
      edge("product_details", "product_options"),
      edge("product_options", "custom_fields"),
      edge("custom_fields", "quantity"),
      edge("quantity", "cart_menu"),
      edge("cart_menu", "checkout"),
      edge("checkout", "order_review"),
      edge("order_review", "order_confirmation"),
      edge("order_confirmation", "end"),
      edge("human_handoff", "end"),
    ],
    settings,
    copy: copyBlock,
  };
}

export function validateFlowDefinition(value: unknown): FlowValidationResult {
  const issues: FlowValidationIssue[] = [];
  if (!isRecord(value)) return invalid("INVALID_JSON", "Flow JSON must be an object.");
  const flow = value as Partial<FlowDefinition>;
  if (!text(flow.id)) issues.push(error("FLOW_ID_REQUIRED", "Flow id is required."));
  if (!text(flow.name)) issues.push(error("FLOW_NAME_REQUIRED", "Flow name is required."));
  if (!text(flow.startNodeId))
    issues.push(error("START_REQUIRED", "Flow startNodeId is required."));
  if (!Array.isArray(flow.supportedLanguages) || !flow.supportedLanguages.includes("en")) {
    issues.push(error("LANGUAGE_REQUIRED", "Flow must support English."));
  }
  if (!Array.isArray(flow.nodes) || !flow.nodes.length) {
    issues.push(error("NODES_REQUIRED", "Flow must include nodes."));
    return { ok: false, issues };
  }

  const nodes = flow.nodes as FlowNode[];
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!text(node.id)) issues.push(error("NODE_ID_REQUIRED", "Every node needs an id."));
    if (nodeIds.has(node.id)) issues.push(error("DUPLICATE_NODE", `Duplicate node ${node.id}.`));
    nodeIds.add(node.id);
    if (!supportedNodeTypes.has(node.type)) {
      issues.push(error("UNSUPPORTED_NODE", `Unsupported node type ${String(node.type)}.`));
    }
    const requiredAction = requiredProtectedActions[node.type];
    if (requiredAction && node.protectedAction !== requiredAction) {
      issues.push(
        error(
          "PROTECTED_ACTION_REQUIRED",
          `${node.type} must use protected action ${requiredAction}.`,
        ),
      );
    }
    for (const entry of Object.values(node.messages ?? {})) {
      if (entry && entry.length > 1024) {
        issues.push(error("MESSAGE_TOO_LONG", `${node.id} has message text over 1024 characters.`));
      }
    }
  }

  if (flow.startNodeId && !nodeIds.has(flow.startNodeId)) {
    issues.push(error("START_MISSING", "Start node does not exist."));
  }

  const edges = Array.isArray(flow.edges) ? (flow.edges as FlowEdge[]) : [];
  for (const edgeEntry of edges) {
    if (!nodeIds.has(edgeEntry.from)) {
      issues.push(error("BROKEN_EDGE", `Edge ${edgeEntry.id} has missing from node.`));
    }
    if (!nodeIds.has(edgeEntry.to)) {
      issues.push(error("BROKEN_EDGE", `Edge ${edgeEntry.id} has missing to node.`));
    }
  }

  for (const node of nodes) {
    if (node.next && !nodeIds.has(node.next)) {
      issues.push(error("BROKEN_NEXT", `${node.id} points to missing node ${node.next}.`));
    }
  }

  const reachable = getReachableNodeIds(flow.startNodeId, nodes, edges);
  for (const node of nodes) {
    if (!reachable.has(node.id) && !node.optional) {
      issues.push(warning("UNREACHABLE_NODE", `${node.id} is not reachable from start.`));
    }
  }

  const sequence = [...reachable]
    .map((id) => nodes.find((node) => node.id === id)?.type)
    .filter(Boolean);
  const cartIndex = sequence.indexOf("CART_MENU");
  const checkoutIndex = sequence.indexOf("CHECKOUT");
  const reviewIndex = sequence.indexOf("ORDER_REVIEW");
  const confirmIndex = sequence.indexOf("ORDER_CONFIRMATION");
  if (checkoutIndex >= 0 && (cartIndex < 0 || checkoutIndex < cartIndex)) {
    issues.push(error("CHECKOUT_BEFORE_CART", "Checkout cannot happen before cart."));
  }
  if (confirmIndex >= 0 && (reviewIndex < 0 || confirmIndex < reviewIndex)) {
    issues.push(error("CONFIRM_BEFORE_REVIEW", "Order confirmation cannot happen before review."));
  }

  validateCopy(flow.copy, issues);
  validateSettings(flow.settings, issues);

  return {
    ok: !issues.some((issue) => issue.severity === "ERROR"),
    issues,
  };
}

export function flowToBotFlowSettings(
  businessId: string,
  flow: FlowDefinition,
): BotFlowSettingsInput & { businessId: string } {
  return {
    businessId,
    languageSelectionEnabled: flow.settings.languageSelectionEnabled,
    defaultLanguage: flow.settings.defaultLanguage,
    languagePromptEnglish: nodeMessage(flow, "LANGUAGE_SELECT", "en") ?? "Choose your language:",
    languagePromptArabic:
      nodeMessage(flow, "LANGUAGE_SELECT", "ar") ??
      "\u0627\u062e\u062a\u0631 \u0644\u063a\u062a\u0643:",
    welcomeMessageEnglish: copy(flow, "welcome", "en"),
    welcomeMessageArabic: copy(flow, "welcome", "ar"),
    orderButtonEnglish: copy(flow, "orderButton", "en"),
    orderButtonArabic: copy(flow, "orderButton", "ar"),
    questionButtonEnglish: copy(flow, "questionButton", "en"),
    questionButtonArabic: copy(flow, "questionButton", "ar"),
    questionResponseEnglish: copy(flow, "questionResponse", "en"),
    questionResponseArabic: copy(flow, "questionResponse", "ar"),
    infoButtonEnglish: copy(flow, "infoButton", "en"),
    infoButtonArabic: copy(flow, "infoButton", "ar"),
    mainMenuOptions: getMainMenuOptions(flow),
    browseRoutes: getBrowseRoutes(flow),
    infoResponseEnglish: copy(flow, "infoResponse", "en"),
    infoResponseArabic: copy(flow, "infoResponse", "ar"),
    customerNamePromptEnglish: copy(flow, "customerNamePrompt", "en"),
    customerNamePromptArabic: copy(flow, "customerNamePrompt", "ar"),
    fulfillmentPromptEnglish: copy(flow, "fulfillmentPrompt", "en"),
    fulfillmentPromptArabic: copy(flow, "fulfillmentPrompt", "ar"),
    deliveryAreaPromptEnglish: copy(flow, "deliveryAreaPrompt", "en"),
    deliveryAreaPromptArabic: copy(flow, "deliveryAreaPrompt", "ar"),
    pickupLocationPromptEnglish: copy(flow, "pickupLocationPrompt", "en"),
    pickupLocationPromptArabic: copy(flow, "pickupLocationPrompt", "ar"),
    deliveryAddressPromptEnglish: copy(flow, "deliveryAddressPrompt", "en"),
    deliveryAddressPromptArabic: copy(flow, "deliveryAddressPrompt", "ar"),
    paymentMethodPromptEnglish: copy(flow, "paymentMethodPrompt", "en"),
    paymentMethodPromptArabic: copy(flow, "paymentMethodPrompt", "ar"),
    orderNotesPromptEnglish: copy(flow, "orderNotesPrompt", "en"),
    orderNotesPromptArabic: copy(flow, "orderNotesPrompt", "ar"),
    noNotesButtonEnglish: copy(flow, "noNotesButton", "en"),
    noNotesButtonArabic: copy(flow, "noNotesButton", "ar"),
    showProductDetailsBeforeOrdering: flow.settings.showProductDetailsBeforeOrdering,
    autoUseSavedCheckoutDetails: flow.settings.autoUseSavedCheckoutDetails,
    skipFulfillmentWhenSingleOption: flow.settings.skipFulfillmentWhenSingleOption,
    skipDeliveryAreaWhenSingleOption: flow.settings.skipDeliveryAreaWhenSingleOption,
    skipPickupLocationWhenSingleOption: flow.settings.skipPickupLocationWhenSingleOption,
    skipPaymentWhenSingleOption: flow.settings.skipPaymentWhenSingleOption,
    orderNotesEnabled: flow.settings.orderNotesEnabled,
  };
}

function getMainMenuOptions(flow: FlowDefinition): FlowMainMenuOption[] {
  const nodesById = new Map(flow.nodes.map((node) => [node.id, node]));
  const configured = flow.editor?.mainMenuOptions;
  if (configured) {
    return configured
      .filter((option) => option.active)
      .map((option, index) => ({
        ...option,
        key: option.key || `option_${index + 1}`,
        response:
          option.response ??
          (option.targetNodeId ? nodesById.get(option.targetNodeId)?.messages : undefined),
        sortOrder: option.sortOrder || index + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return [
    {
      key: "order",
      label: flow.copy.orderButton,
      targetNodeId: "category_select",
      active: true,
      sortOrder: 1,
    },
    {
      key: "question",
      label: flow.copy.questionButton,
      targetNodeId: "human_handoff",
      active: true,
      sortOrder: 2,
    },
    {
      key: "info",
      label: flow.copy.infoButton,
      targetNodeId: "store_info",
      active: true,
      sortOrder: 3,
    },
  ];
}

function getBrowseRoutes(flow: FlowDefinition): FlowBrowseRoute[] {
  const configured = flow.editor?.browseRoutes;
  const routes = configured ?? defaultBrowseRoutes();
  return routes
    .filter((route) => route.active !== false)
    .map((route, index): FlowBrowseRoute => {
      return {
        ...route,
        key: route.key.trim() || `browse_route_${index + 1}`,
        source: "catalog_group",
        groupSlug: route.groupSlug?.trim() || route.key.trim(),
        label: {
          en: route.label.en.trim() || "Browse",
          ar: route.label.ar.trim() || route.label.en.trim() || "Categories",
        },
        active: true,
        sortOrder: route.sortOrder || index + 1,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function defaultBrowseRoutes(): FlowBrowseRoute[] {
  return [
    {
      key: "collections",
      source: "catalog_group",
      groupSlug: "collections",
      label: { en: "Collections", ar: "\u0645\u062c\u0645\u0648\u0639\u0627\u062a" },
      active: true,
      sortOrder: 1,
    },
  ];
}

function nodeMessage(
  flow: FlowDefinition,
  type: FlowNodeType,
  language: FlowLanguage,
): string | undefined {
  const messages = flow.nodes.find((node) => node.type === type)?.messages;
  return messages?.[language]?.trim() || messages?.en?.trim() || undefined;
}

function getReachableNodeIds(
  startNodeId: string | undefined,
  nodes: FlowNode[],
  edges: FlowEdge[],
) {
  const reachable = new Set<string>();
  if (!startNodeId) return reachable;
  const queue = [startNodeId];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  while (queue.length) {
    const current = queue.shift();
    if (!current || reachable.has(current) || !byId.has(current)) continue;
    reachable.add(current);
    const next = byId.get(current)?.next;
    if (next) queue.push(next);
    for (const edgeEntry of edges.filter((entry) => entry.from === current)) {
      queue.push(edgeEntry.to);
    }
  }
  return reachable;
}

function validateCopy(copyValue: unknown, issues: FlowValidationIssue[]) {
  if (!isRecord(copyValue)) {
    issues.push(error("COPY_REQUIRED", "Flow copy block is required."));
    return;
  }
  const keys = ["welcome", "orderButton", "questionButton", "infoButton"] as const;
  for (const key of keys) {
    const entry = copyValue[key];
    if (!isRecord(entry) || !text(entry.en)) {
      issues.push(error("COPY_EN_REQUIRED", `${key} English copy is required.`));
    }
    if (
      isRecord(entry) &&
      typeof entry.en === "string" &&
      entry.en.length > maxWhatsAppListTitleLength
    ) {
      if (key.includes("Button")) {
        issues.push(error("BUTTON_TOO_LONG", `${key} English label must fit WhatsApp buttons.`));
      }
    }
    if (
      isRecord(entry) &&
      typeof entry.ar === "string" &&
      entry.ar.length > maxWhatsAppButtonLength
    ) {
      if (key.includes("Button")) {
        issues.push(warning("BUTTON_AR_LONG", `${key} Arabic label may be too long for WhatsApp.`));
      }
    }
  }
}

function validateSettings(settings: unknown, issues: FlowValidationIssue[]) {
  if (!isRecord(settings)) {
    issues.push(error("SETTINGS_REQUIRED", "Flow settings block is required."));
    return;
  }
  if (settings.defaultLanguage !== "en" && settings.defaultLanguage !== "ar") {
    issues.push(error("DEFAULT_LANGUAGE_INVALID", "Default language must be en or ar."));
  }
  if (settings.allowRestart !== true) {
    issues.push(error("RESTART_REQUIRED", "Flow must keep restart support enabled."));
  }
}

function copy(flow: FlowDefinition, key: keyof FlowDefinition["copy"], language: FlowLanguage) {
  return flow.copy[key][language] || flow.copy[key].en;
}

function edge(from: string, to: string, condition?: string): FlowEdge {
  return { id: `${from}_to_${to}`, from, to, condition: condition ?? null };
}

function templateVariant(category: FlowCategory) {
  if (category === "ECOMMERCE") {
    return {
      id: "ecommerce",
      name: "E-commerce",
      welcome: {
        en: "Welcome. Browse products, get store information, or ask for help.",
        ar: "\u0623\u0647\u0644\u0627. \u062a\u0635\u0641\u062d \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0623\u0648 \u0627\u0637\u0644\u0628 \u0645\u0633\u0627\u0639\u062f\u0629.",
      },
      orderButton: {
        en: "Place an order",
        ar: "\u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628",
      },
      infoResponse: "We are open daily. Send a message here if you need help.",
      notesPrompt: "Would you like to add any notes?",
    };
  }
  if (category === "RESTAURANT") {
    return {
      id: "restaurant",
      name: "Restaurant",
      welcome: {
        en: "Welcome. Browse the menu, order food, or ask about the restaurant.",
        ar: "\u0623\u0647\u0644\u0627. \u062a\u0635\u0641\u062d \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0623\u0648 \u0627\u0637\u0644\u0628 \u0627\u0644\u0637\u0639\u0627\u0645.",
      },
      orderButton: { en: "Order food", ar: "\u0627\u0637\u0644\u0628 \u0637\u0639\u0627\u0645" },
      infoResponse: "Ask us about opening hours, delivery, reservations, or menu items.",
      notesPrompt: "Add any delivery, allergy, or preparation notes?",
    };
  }
  if (category === "GREETING_STORE_INFO") {
    return {
      id: "greeting_store_info",
      name: "Greeting + Store Info",
      welcome: {
        en: "Welcome. Choose an option and our team will help you.",
        ar: "\u0623\u0647\u0644\u0627. \u0627\u062e\u062a\u0631 \u062e\u064a\u0627\u0631\u0627 \u0648\u0633\u0646\u0633\u0627\u0639\u062f\u0643.",
      },
      orderButton: { en: "Store info", ar: "\u0645\u0639\u0644\u0648\u0645\u0627\u062a" },
      infoResponse: "We are open daily. Send us a message if you need anything else.",
      notesPrompt: "Would you like to add any notes?",
    };
  }
  if (category === "JEWELRY") {
    return {
      id: "jewelry_store",
      name: "Jewelry Store",
      welcome: {
        en: "Welcome. Browse jewelry, gifts, and custom pieces.",
        ar: "\u0623\u0647\u0644\u0627. \u062a\u0635\u0641\u062d \u0627\u0644\u0645\u062c\u0648\u0647\u0631\u0627\u062a \u0648\u0627\u0644\u0647\u062f\u0627\u064a\u0627.",
      },
      orderButton: { en: "Shop jewelry", ar: "\u062a\u0633\u0648\u0642" },
      infoResponse: "Ask us about sizing, engraving, or gift wrapping.",
      notesPrompt: "Add notes such as engraving text or gift wrapping requests?",
    };
  }
  if (category === "CLOTHING") {
    return {
      id: "clothing_store",
      name: "Clothing Store",
      welcome: {
        en: "Welcome. Browse clothing by category, size, and color.",
        ar: "\u0623\u0647\u0644\u0627. \u062a\u0635\u0641\u062d \u0627\u0644\u0645\u0644\u0627\u0628\u0633 \u062d\u0633\u0628 \u0627\u0644\u0645\u0642\u0627\u0633 \u0648\u0627\u0644\u0644\u0648\u0646.",
      },
      orderButton: { en: "Shop clothing", ar: "\u062a\u0633\u0648\u0642" },
      infoResponse: "Send us your sizing question here and our team will help.",
      notesPrompt: "Add any sizing, color, or delivery notes?",
    };
  }
  return {
    id: "standard_online_store",
    name: "Standard Online Store",
    welcome: {
      en: "How can we help?",
      ar: "\u0643\u064a\u0641 \u064a\u0645\u0643\u0646\u0646\u0627 \u0645\u0633\u0627\u0639\u062f\u062a\u0643\u061f",
    },
    orderButton: { en: "Place an order", ar: "\u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628" },
    infoResponse: "We are open daily. Send a message here if you need help.",
    notesPrompt: "Would you like to add any notes?",
  };
}

function invalid(code: string, message: string): FlowValidationResult {
  return { ok: false, issues: [error(code, message)] };
}

function error(code: string, message: string): FlowValidationIssue {
  return { code, message, severity: "ERROR" };
}

function warning(code: string, message: string): FlowValidationIssue {
  return { code, message, severity: "WARNING" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
