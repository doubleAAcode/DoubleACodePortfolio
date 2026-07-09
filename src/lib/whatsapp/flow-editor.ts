import {
  validateFlowDefinition,
  type FlowBrowseRoute,
  type FlowCustomQuestion,
  type FlowDefinition,
  type FlowEditorConfig,
  type FlowLanguage,
  type FlowMainMenuOption,
  type FlowValidationIssue,
  type FlowValidationResult,
} from "./flow-template-types.ts";

export type FlowEditorModel = {
  name: string;
  description: string;
  supportedLanguages: FlowLanguage[];
  defaultLanguage: FlowLanguage;
  commands: {
    allowRestart: boolean;
    allowMenu: boolean;
    allowBack: boolean;
    allowCart: boolean;
    allowHumanHandoff: boolean;
  };
  copy: Pick<
    FlowDefinition["copy"],
    | "welcome"
    | "orderButton"
    | "questionButton"
    | "questionResponse"
    | "infoButton"
    | "infoResponse"
    | "customerNamePrompt"
    | "fulfillmentPrompt"
    | "orderNotesPrompt"
    | "noNotesButton"
  >;
  mainMenuOptions: FlowMainMenuOption[];
  browseRoutes: FlowBrowseRoute[];
  storeInfo: {
    openingHours: string;
    location: string;
    contact: string;
  };
  ordering: Required<NonNullable<FlowEditorConfig["ordering"]>>;
  checkout: Required<NonNullable<FlowEditorConfig["checkout"]>>;
  humanHandoff: Required<NonNullable<FlowEditorConfig["humanHandoff"]>>;
  customQuestions: FlowCustomQuestion[];
};

export type FlowPreview = {
  language: FlowLanguage;
  welcome: string;
  mainMenu: string;
  buttons: string[];
  storeInfo: string;
  handoff?: string;
  customQuestions: Array<{ key: string; label: string; required: boolean }>;
};

const buttonLimit = 20;
const messageWarningLimit = 900;

export function createFlowEditorModel(flow: FlowDefinition): FlowEditorModel {
  const editor = flow.editor ?? {};
  const handoff = editor.humanHandoff;
  return {
    name: flow.name,
    description: flow.description ?? "",
    supportedLanguages: flow.supportedLanguages.length ? flow.supportedLanguages : ["en"],
    defaultLanguage: flow.settings.defaultLanguage,
    commands: {
      allowRestart: flow.settings.allowRestart,
      allowMenu: editor.commands?.allowMenu ?? true,
      allowBack: flow.settings.allowBack,
      allowCart: editor.commands?.allowCart ?? true,
      allowHumanHandoff: flow.settings.allowHumanHandoff,
    },
    copy: {
      welcome: copyPair(flow, "welcome"),
      orderButton: copyPair(flow, "orderButton"),
      questionButton: copyPair(flow, "questionButton"),
      questionResponse: copyPair(flow, "questionResponse"),
      infoButton: copyPair(flow, "infoButton"),
      infoResponse: copyPair(flow, "infoResponse"),
      customerNamePrompt: copyPair(flow, "customerNamePrompt"),
      fulfillmentPrompt: copyPair(flow, "fulfillmentPrompt"),
      orderNotesPrompt: copyPair(flow, "orderNotesPrompt"),
      noNotesButton: copyPair(flow, "noNotesButton"),
    },
    mainMenuOptions: getEditorMainMenuOptions(flow),
    browseRoutes: getEditorBrowseRoutes(flow),
    storeInfo: {
      openingHours: editor.storeInfo?.openingHours ?? "",
      location: editor.storeInfo?.location ?? "",
      contact: editor.storeInfo?.contact ?? "",
    },
    ordering: {
      showProductCode: editor.ordering?.showProductCode ?? true,
      showProductDescription: editor.ordering?.showProductDescription ?? true,
      showProductPrice: editor.ordering?.showProductPrice ?? true,
      allowProductCodeLookup: editor.ordering?.allowProductCodeLookup ?? true,
      showUnavailableProducts: editor.ordering?.showUnavailableProducts ?? true,
      allowUnavailableOrdering: editor.ordering?.allowUnavailableOrdering ?? false,
      showProductImage: editor.ordering?.showProductImage ?? true,
      quantityQuickButtons: editor.ordering?.quantityQuickButtons ?? true,
      allowAddAnotherItem: editor.ordering?.allowAddAnotherItem ?? true,
      allowViewCart: editor.ordering?.allowViewCart ?? true,
    },
    checkout: {
      askCustomerName: editor.checkout?.askCustomerName ?? true,
      askAlternatePhone: editor.checkout?.askAlternatePhone ?? false,
      askFulfillmentChoice: editor.checkout?.askFulfillmentChoice ?? true,
      askNotes: editor.checkout?.askNotes ?? flow.settings.orderNotesEnabled,
      showFinalReview: editor.checkout?.showFinalReview ?? true,
      requireFinalConfirmation: editor.checkout?.requireFinalConfirmation ?? true,
    },
    humanHandoff: {
      enabled: handoff?.enabled ?? flow.settings.allowHumanHandoff,
      label: handoff?.label ?? { en: "Human support", ar: "دعم بشري" },
      response: handoff?.response ?? {
        en: "A team member will help you shortly.",
        ar: "سيساعدك أحد أعضاء الفريق قريباً.",
      },
      maxInvalidAttempts: handoff?.maxInvalidAttempts ?? 3,
      ownerSupportNote: handoff?.ownerSupportNote ?? "",
    },
    customQuestions: editor.customQuestions ?? [],
  };
}

export function applyFlowEditorModel(flow: FlowDefinition, model: FlowEditorModel): FlowDefinition {
  const nextCopy = {
    ...flow.copy,
    welcome: model.copy.welcome,
    orderButton: model.copy.orderButton,
    questionButton: model.copy.questionButton,
    questionResponse: model.copy.questionResponse,
    infoButton: model.copy.infoButton,
    infoResponse: model.copy.infoResponse,
    customerNamePrompt: model.copy.customerNamePrompt,
    fulfillmentPrompt: model.copy.fulfillmentPrompt,
    orderNotesPrompt: model.copy.orderNotesPrompt,
    noNotesButton: model.copy.noNotesButton,
  };
  const mainMenuOptions = model.mainMenuOptions.map((option, index) => ({
    ...option,
    key: option.key.trim() || `option_${index + 1}`,
    active: option.active !== false,
    sortOrder: index + 1,
  }));
  const browseRoutes = normalizeBrowseRoutes(model.browseRoutes);
  return {
    ...flow,
    name: model.name.trim(),
    description: model.description.trim(),
    supportedLanguages: model.supportedLanguages,
    settings: {
      ...flow.settings,
      allowHumanHandoff: model.commands.allowHumanHandoff,
      allowRestart: model.commands.allowRestart,
      allowBack: model.commands.allowBack,
      defaultLanguage: model.defaultLanguage,
      orderNotesEnabled: model.checkout.askNotes,
      allowDelivery: flow.settings.allowDelivery,
      allowPickup: flow.settings.allowPickup,
    },
    copy: nextCopy,
    nodes: flow.nodes.map((node) =>
      node.id === flow.startNodeId ? { ...node, messages: model.copy.welcome } : node,
    ),
    visualFlow: syncVisualFlowFromEditor(flow.visualFlow, model),
    editor: {
      commands: {
        allowMenu: model.commands.allowMenu,
        allowCart: model.commands.allowCart,
      },
      mainMenuOptions,
      browseRoutes,
      storeInfo: model.storeInfo,
      ordering: model.ordering,
      checkout: model.checkout,
      humanHandoff: model.humanHandoff,
      customQuestions: model.customQuestions,
    },
  };
}

function syncVisualFlowFromEditor(visualFlow: unknown, model: FlowEditorModel) {
  if (!isVisualFlowDraft(visualFlow)) return visualFlow;
  return {
    ...visualFlow,
    nodes: visualFlow.nodes.map((node) => {
      if (node.type === "MAIN_MENU") {
        return {
          ...node,
          config: {
            ...node.config,
            messages: model.copy.welcome,
            menuOptions: model.mainMenuOptions.map((option) => ({
              key: option.key,
              label: option.label,
              targetNodeId: option.targetNodeId,
              active: option.active,
            })),
          },
        };
      }
      if (node.type === "STORE_INFO") {
        return {
          ...node,
          config: {
            ...node.config,
            messages: model.copy.infoResponse,
          },
        };
      }
      if (node.type === "HUMAN_HANDOFF") {
        return {
          ...node,
          config: {
            ...node.config,
            labels: model.humanHandoff.label,
            messages: model.humanHandoff.response,
            handoff: {
              pauseBot: model.humanHandoff.enabled,
              ownerAlert: model.commands.allowHumanHandoff,
              returnBehavior: "manual_resume",
            },
          },
        };
      }
      if (node.type === "QUESTION") {
        const questionKey =
          typeof node.config.question === "object" &&
          node.config.question &&
          "key" in node.config.question
            ? String(node.config.question.key)
            : "";
        const question = model.customQuestions.find((entry) => entry.key === questionKey);
        if (!question) return node;
        return {
          ...node,
          config: {
            ...node.config,
            question,
          },
        };
      }
      return node;
    }),
  };
}

function isVisualFlowDraft(value: unknown): value is {
  nodes: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
} {
  return Boolean(
    value && typeof value === "object" && Array.isArray((value as { nodes?: unknown }).nodes),
  );
}

export function validateFlowForEditor(flow: FlowDefinition): FlowValidationResult {
  const base = validateFlowDefinition(flow);
  const issues = [...base.issues];
  const model = createFlowEditorModel(flow);

  if (!model.supportedLanguages.length) {
    issues.push(error("EDITOR_LANGUAGE_REQUIRED", "At least one supported language is required."));
  }
  if (!model.supportedLanguages.includes(model.defaultLanguage)) {
    issues.push(error("EDITOR_DEFAULT_LANGUAGE", "Default language must be enabled."));
  }

  validateRequiredCopy(model, issues);
  validateMainMenuOptions(model.mainMenuOptions, model.supportedLanguages, issues);
  validateCustomQuestions(model.customQuestions, model.supportedLanguages, issues);

  if (model.ordering.allowUnavailableOrdering) {
    issues.push(error("UNAVAILABLE_ORDERING_BLOCKED", "Unavailable products cannot be orderable."));
  }
  if (!model.checkout.showFinalReview) {
    issues.push(error("FINAL_REVIEW_REQUIRED", "Final order review cannot be disabled."));
  }
  if (!model.checkout.requireFinalConfirmation) {
    issues.push(
      error("FINAL_CONFIRMATION_REQUIRED", "Final order confirmation cannot be disabled."),
    );
  }
  if (!flow.settings.allowDelivery && !flow.settings.allowPickup) {
    issues.push(error("FULFILLMENT_REQUIRED", "Delivery or pickup must be enabled."));
  }
  if (!model.commands.allowHumanHandoff) {
    issues.push(warning("HANDOFF_DISABLED", "Human handoff is disabled."));
  }
  if (!model.copy.infoResponse.en.trim() && !model.copy.infoResponse.ar.trim()) {
    issues.push(warning("STORE_INFO_EMPTY", "Store information response is empty."));
  }

  return {
    ok: !issues.some((issue) => issue.severity === "ERROR"),
    issues,
  };
}

export function createFlowPreview(flow: FlowDefinition, language: FlowLanguage): FlowPreview {
  const model = createFlowEditorModel(flow);
  const buttons = model.mainMenuOptions
    .filter((option) => option.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((option) => option.label[language] || option.label.en);
  if (model.humanHandoff.enabled)
    buttons.push(model.humanHandoff.label[language] || model.humanHandoff.label.en);
  return {
    language,
    welcome: model.copy.welcome[language] || model.copy.welcome.en,
    mainMenu: model.copy.welcome[language] || model.copy.welcome.en,
    buttons,
    storeInfo: composeStoreInfo(model, language),
    handoff: model.humanHandoff.enabled
      ? model.humanHandoff.response[language] || model.humanHandoff.response.en
      : undefined,
    customQuestions: model.customQuestions
      .filter((question) => question.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((question) => ({
        key: question.key,
        label: question.label[language] || question.label.en,
        required: question.required,
      })),
  };
}

function copyPair(flow: FlowDefinition, key: keyof FlowEditorModel["copy"]) {
  return {
    en: flow.copy[key].en ?? "",
    ar: flow.copy[key].ar ?? "",
  };
}

function getEditorMainMenuOptions(flow: FlowDefinition): FlowMainMenuOption[] {
  const configured = flow.editor?.mainMenuOptions;
  if (configured?.length) {
    return configured
      .map((option, index) => ({
        ...option,
        key: option.key || `option_${index + 1}`,
        active: option.active !== false,
        sortOrder: option.sortOrder || index + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return [
    {
      key: "order",
      label: copyPair(flow, "orderButton"),
      targetNodeId: "category_select",
      active: true,
      sortOrder: 1,
    },
    {
      key: "question",
      label: copyPair(flow, "questionButton"),
      targetNodeId: "human_handoff",
      active: true,
      sortOrder: 2,
    },
    {
      key: "info",
      label: copyPair(flow, "infoButton"),
      targetNodeId: "store_info",
      active: true,
      sortOrder: 3,
    },
  ];
}

function getEditorBrowseRoutes(flow: FlowDefinition): FlowBrowseRoute[] {
  const configured = flow.editor?.browseRoutes;
  if (configured?.length) return normalizeBrowseRoutes(configured);
  return [
    {
      key: "categories",
      source: "categories",
      label: { en: "Categories", ar: "\u0627\u0644\u0641\u0626\u0627\u062a" },
      active: true,
      sortOrder: 1,
    },
  ];
}

function normalizeBrowseRoutes(routes: FlowBrowseRoute[]): FlowBrowseRoute[] {
  return routes.map((route, index) => ({
    key: route.key.trim() || `browse_route_${index + 1}`,
    source: route.source === "catalog_group" ? "catalog_group" : "categories",
    groupSlug:
      route.source === "catalog_group" ? route.groupSlug?.trim() || route.key.trim() : undefined,
    label: {
      en: route.label.en.trim() || (route.source === "catalog_group" ? "Browse" : "Categories"),
      ar: route.label.ar.trim() || route.label.en.trim() || "Categories",
    },
    active: route.active !== false,
    sortOrder: index + 1,
  }));
}

function composeStoreInfo(model: FlowEditorModel, language: FlowLanguage) {
  return [
    model.copy.infoResponse[language] || model.copy.infoResponse.en,
    model.storeInfo.openingHours,
    model.storeInfo.location,
    model.storeInfo.contact,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
}

function validateRequiredCopy(model: FlowEditorModel, issues: FlowValidationIssue[]) {
  const required = [
    ["welcome", model.copy.welcome],
    ["customerNamePrompt", model.copy.customerNamePrompt],
    ["fulfillmentPrompt", model.copy.fulfillmentPrompt],
  ] as const;
  for (const [key, value] of required) {
    for (const language of model.supportedLanguages) {
      if (!value[language]?.trim()) {
        issues.push(error("COPY_LANGUAGE_REQUIRED", `${key} ${language} copy is required.`));
      }
      if ((value[language]?.length ?? 0) > messageWarningLimit) {
        issues.push(warning("COPY_LONG", `${key} ${language} copy is long for WhatsApp.`));
      }
    }
  }
}

function validateMainMenuOptions(
  options: FlowMainMenuOption[],
  languages: FlowLanguage[],
  issues: FlowValidationIssue[],
) {
  const activeOptions = options.filter((option) => option.active);
  if (!activeOptions.length) {
    issues.push(error("MENU_OPTIONS_REQUIRED", "Main menu needs at least one active option."));
  }
  for (const language of languages) {
    const labels = activeOptions.map((option) =>
      (option.label[language] || option.label.en).trim().toLowerCase(),
    );
    for (const label of labels) {
      if (!label) issues.push(error("BUTTON_EMPTY", `${language} button labels cannot be empty.`));
      if (label.length > buttonLimit) {
        issues.push(warning("BUTTON_LONG", `${language} button label may exceed WhatsApp limits.`));
      }
    }
    if (new Set(labels).size !== labels.length) {
      issues.push(error("BUTTON_DUPLICATE", `${language} main menu button labels must be unique.`));
    }
  }
  const keys = activeOptions.map((option) => option.key.trim().toLowerCase());
  if (new Set(keys).size !== keys.length) {
    issues.push(error("MENU_OPTION_KEY_DUPLICATE", "Main menu option keys must be unique."));
  }
}

function validateCustomQuestions(
  questions: FlowCustomQuestion[],
  languages: FlowLanguage[],
  issues: FlowValidationIssue[],
) {
  const keys = new Set<string>();
  for (const question of questions.filter((entry) => entry.active)) {
    const key = question.key.trim();
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(key)) {
      issues.push(error("QUESTION_KEY_INVALID", "Question keys must be stable snake_case ids."));
    }
    if (keys.has(key))
      issues.push(error("QUESTION_KEY_DUPLICATE", `Duplicate question key ${key}.`));
    keys.add(key);
    for (const language of languages) {
      if (!question.label[language]?.trim()) {
        issues.push(error("QUESTION_LABEL_REQUIRED", `${key} needs a ${language} label.`));
      }
    }
    if (
      question.type === "number" &&
      question.minValue != null &&
      question.maxValue != null &&
      question.minValue > question.maxValue
    ) {
      issues.push(error("QUESTION_NUMBER_RANGE", `${key} has an invalid number range.`));
    }
    if (question.type === "single_choice" && (question.choices?.length ?? 0) < 2) {
      issues.push(error("QUESTION_CHOICES_REQUIRED", `${key} needs at least two choices.`));
    }
  }
}

function error(code: string, message: string): FlowValidationIssue {
  return { code, message, severity: "ERROR" };
}

function warning(code: string, message: string): FlowValidationIssue {
  return { code, message, severity: "WARNING" };
}
