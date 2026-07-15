import "@tanstack/react-start/server-only";
import {
  DOUBLE_A_TEST_BUSINESS_ID,
  findActiveCategoryById,
  findProductOptionValue,
  findVisibleProductByCode,
  findVisibleProductById,
  getCatalogGroupName,
  getCatalogGroupValueName,
  getCategoryName,
  getCustomFieldLabel,
  getCustomFieldPlaceholder,
  getOptionName,
  getOptionValueName,
  getProductDescription,
  getProductName,
  listActiveCategories,
  listActiveCatalogGroups,
  listActiveCatalogGroupValues,
  listProductCustomFields,
  listProductOptions,
  listProductOptionValues,
  listProductVariants,
  listVisibleProductsByCategory,
  listVisibleProductsByGroupValue,
  resolveProductVariant,
  type StoreCatalogGroup,
  type StoreCatalogGroupValue,
  type StoreCategory,
  type StoreProduct,
  type StoreProductCustomField,
  type StoreProductOption,
  type StoreProductVariant,
} from "./catalog-repository.server";
import {
  getBusinessBotFlowSettings,
  getDefaultBotFlowSettings,
  type BusinessBotFlowSettings,
} from "./bot-flow-settings.server";
import {
  buildCartItem,
  calculateCart,
  getCartFromContext,
  getPendingItemFromContext,
  getStockLimit,
  type CartItem,
  type PendingItem,
} from "./cart-service.server";
import {
  getBusinessCheckoutSettings,
  getDeliveryAreaName,
  getPaymentMethodLabel,
  type FulfillmentMethod,
  getPickupLocationAddress,
  getPickupLocationName,
  type BusinessCheckoutSettings,
} from "./checkout-settings.server";
import {
  getReusableCheckoutFromProfile,
  getWhatsAppCustomerProfile,
  saveWhatsAppCustomerProfileFromOrder,
  type WhatsAppCustomerProfile,
} from "./customer-profile-store.server";
import {
  createConversationSession,
  deleteConversationSession,
  getActiveConversationSession,
  saveConversationSession,
  type ConversationLanguage,
  type ConversationSession,
  type ConversationStep,
} from "./conversation-store.server";
import {
  createPendingOrder,
  validateCartForOrder,
  type CheckoutDraft,
  type WhatsAppOrder,
} from "./order-store.server";
import { createOwnerNewOrderNotifications } from "./owner-notifications.server";
import {
  getActiveBusinessFlow,
  getBusinessFlowVersion,
  type ActiveBusinessFlow,
} from "./flow-template-store.server";
import { flowToBotFlowSettings, type FlowDefinition, type FlowNode } from "./flow-template-types";
import { loadCanonicalFlowDocument } from "./flow-document";
import { isRuntimeNodeTypeSupported } from "./runtime-node-handlers.server";
import {
  createCorrelationId,
  logWhatsAppError,
  logWhatsAppInfo,
  type WhatsAppLogContext,
} from "./logger.server";

export { DOUBLE_A_TEST_BUSINESS_ID };

export type ConversationInput = {
  type: "text" | "button" | "list" | "location" | "unknown";
  value: string;
  latitude?: number;
  longitude?: number;
};

export type BotResponse =
  | { type: "text"; text: string }
  | { type: "image"; imageUrl: string; caption?: string }
  | {
      type: "buttons";
      body: string;
      buttons: Array<{ id: string; title: string }>;
    }
  | {
      type: "list";
      body: string;
      buttonText: string;
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    };

const PAGE_SIZE = 6;
const MAX_QUANTITY_PER_ITEM = 10;
const MAX_AUTOMATIC_RUNTIME_TRANSITIONS = 12;
const visualRuntimeNodeTypes = new Set<FlowNode["type"]>([
  "MESSAGE",
  "IMAGE_MESSAGE",
  "LANGUAGE_SELECT",
  "MAIN_MENU",
  "HUMAN_HANDOFF",
  "END",
]);

async function measureConversationPhase<T>(
  context: Omit<WhatsAppLogContext, "operation">,
  phase: string,
  task: () => Promise<T>,
) {
  const startedAt = Date.now();
  try {
    const result = await task();
    logWhatsAppInfo({
      ...context,
      operation: `conversation.timing.${phase}`,
      durationMs: Date.now() - startedAt,
      result: "ok",
    });
    return result;
  } catch (error) {
    logWhatsAppError(
      {
        ...context,
        operation: `conversation.timing.${phase}`,
        durationMs: Date.now() - startedAt,
        result: "error",
      },
      error,
    );
    throw error;
  }
}

function logConversationTotal(
  context: Omit<WhatsAppLogContext, "operation">,
  startedAt: number,
  responses: BotResponse[],
) {
  logWhatsAppInfo({
    ...context,
    operation: "conversation.timing.total",
    durationMs: Date.now() - startedAt,
    result: "ok",
    details: {
      ...context.details,
      responseCount: responses.length,
      responseTypes: responses.map((response) => response.type),
    },
  });
}

function measureOptionalConversationPhase<T>(
  context: Omit<WhatsAppLogContext, "operation"> | undefined,
  phase: string,
  task: () => Promise<T>,
) {
  return context ? measureConversationPhase(context, phase, task) : task();
}

function timedSaveConversationSession(
  context: Omit<WhatsAppLogContext, "operation"> | undefined,
  phase: string,
  session: ConversationSession,
  now: Date,
) {
  return measureOptionalConversationPhase(context, phase, () =>
    saveConversationSession(session, now),
  );
}

export async function processIncomingMessage({
  businessId,
  customerPhone,
  messageId,
  input,
}: {
  businessId: string;
  customerPhone: string;
  messageId: string;
  input: ConversationInput;
}): Promise<BotResponse[]> {
  const now = new Date();
  const timingContext = {
    correlationId: createCorrelationId("wa_conversation"),
    businessId,
    customerPhone,
    metaMessageId: messageId,
    details: { inputType: input.type, inputLength: input.value.length },
  };
  const processStartedAt = Date.now();
  const activeFlow = await measureConversationPhase(timingContext, "active_flow_load", () =>
    getActiveBusinessFlow(businessId),
  );
  let session = await measureConversationPhase(timingContext, "session_load", () =>
    getActiveConversationSession({ businessId, customerPhone, now }),
  );
  let conversationFlow = session
    ? await resolveSessionFlowVersion({
        businessId,
        session,
        activeFlow,
        now,
        timingContext,
      })
    : activeFlow;
  if (session && !session.flowVersionId && conversationFlow) {
    session = await saveConversationSession(
      {
        ...session,
        businessFlowId: conversationFlow.businessFlowId,
        flowVersionId: conversationFlow.flowVersionId,
        currentNodeId: session.currentNodeId ?? conversationFlow.flow.startNodeId,
      },
      now,
    );
    logWhatsAppInfo({
      ...timingContext,
      operation: "conversation.flow_version_legacy_session_pinned",
      result: "ok",
      details: { flowVersionId: conversationFlow.flowVersionId },
    });
  }
  const runtimeFlowSettings = conversationFlow
    ? flowToBotFlowSettings(businessId, conversationFlow.flow)
    : null;
  const flowSettings =
    runtimeFlowSettings ??
    (await measureConversationPhase(timingContext, "bot_flow_settings_load", () =>
      getBusinessBotFlowSettings(businessId),
    ));

  if (!session) {
    session = await measureConversationPhase(timingContext, "session_create", () =>
      createConversationSession({
        businessId,
        customerPhone,
        businessFlowId: activeFlow?.businessFlowId,
        flowVersionId: activeFlow?.flowVersionId,
        currentNodeId: activeFlow?.flow.startNodeId,
        now,
      }),
    );
    if (!session) throw new Error("Conversation session could not be created.");
    conversationFlow = activeFlow;
    const createdSession = session;
    const createdFlow = conversationFlow?.flow;
    if (createdFlow && usesVisualRuntime(createdFlow)) {
      const responses = await measureConversationPhase(timingContext, "visual_entry", () =>
        enterVisualNode(
          createdSession,
          createdFlow,
          createdFlow.startNodeId,
          now,
          [],
          timingContext,
        ),
      );
      logConversationTotal(timingContext, processStartedAt, responses);
      return responses;
    }
    if (!flowSettings.languageSelectionEnabled) {
      session = await measureConversationPhase(
        timingContext,
        "session_save_initial_main_menu",
        () =>
          saveConversationSession(
            {
              ...createdSession,
              language: flowSettings.defaultLanguage,
              currentStep: "MAIN_MENU",
            },
            now,
          ),
      );
      const mainMenuSession = session;
      const responses = await measureConversationPhase(timingContext, "handler.main_menu", () =>
        handleMainMenu(mainMenuSession, input, now, flowSettings),
      );
      logConversationTotal(timingContext, processStartedAt, responses);
      return responses;
    }
  }

  const command = getGlobalCommand(input.value);

  if (command === "restart") {
    await deleteConversationSession({ businessId, customerPhone });
    session = await createConversationSession({
      businessId,
      customerPhone,
      businessFlowId: activeFlow?.businessFlowId,
      flowVersionId: activeFlow?.flowVersionId,
      currentNodeId: activeFlow?.flow.startNodeId,
      now,
    });
    if (!session) throw new Error("Conversation session could not be restarted.");
    conversationFlow = activeFlow;
    const restartedSession = session;
    const restartedFlow = conversationFlow?.flow;
    if (restartedFlow && usesVisualRuntime(restartedFlow)) {
      const responses = await measureConversationPhase(timingContext, "visual_restart_entry", () =>
        enterVisualNode(
          restartedSession,
          restartedFlow,
          restartedFlow.startNodeId,
          now,
          [],
          timingContext,
        ),
      );
      logConversationTotal(timingContext, processStartedAt, responses);
      return responses;
    }
    if (!flowSettings.languageSelectionEnabled) {
      await saveConversationSession(
        {
          ...session,
          language: flowSettings.defaultLanguage,
          currentStep: "MAIN_MENU",
        },
        now,
      );
      return [mainMenuResponse(flowSettings.defaultLanguage, flowSettings)];
    }
    return [languageSelectionResponse(flowSettings)];
  }

  if (command === "menu") {
    if (conversationFlow?.flow && usesVisualRuntime(conversationFlow.flow)) {
      const language = session.language ?? flowSettings.defaultLanguage;
      const mainMenu = conversationFlow.flow.nodes.find((node) => node.type === "MAIN_MENU");
      if (mainMenu) {
        const nextSession = await saveConversationSession(
          {
            ...session,
            language,
            currentStep: "MAIN_MENU",
            currentNodeId: mainMenu.id,
            context: {
              ...session.context,
              pendingItem: undefined,
              selectedCategoryId: undefined,
              selectedProductId: undefined,
              editingCartItemId: undefined,
            },
          },
          now,
        );
        const responses = await measureConversationPhase(timingContext, "visual_menu_entry", () =>
          enterVisualNode(nextSession, conversationFlow.flow, mainMenu.id, now, [], timingContext),
        );
        logConversationTotal(timingContext, processStartedAt, responses);
        return responses;
      }
    }
    if (!session.language && flowSettings.languageSelectionEnabled)
      return [languageSelectionResponse(flowSettings)];
    const language = session.language ?? flowSettings.defaultLanguage;
    await saveConversationSession(
      {
        ...session,
        language,
        currentStep: "MAIN_MENU",
        context: {
          ...session.context,
          pendingItem: undefined,
          selectedCategoryId: undefined,
          selectedProductId: undefined,
          editingCartItemId: undefined,
        },
      },
      now,
    );
    return [mainMenuResponse(language, flowSettings)];
  }

  if (command === "cart") {
    if (!session.language) return [languageSelectionResponse(flowSettings)];
    const nextSession = await saveConversationSession(
      { ...session, currentStep: "CART_MENU" },
      now,
    );
    return cartMenuResponse(nextSession);
  }

  if (command === "cancel") {
    if (!session.language) return [languageSelectionResponse(flowSettings)];
    if (session.currentStep === "ORDER_CREATED") {
      await saveConversationSession(session, now);
      return [
        {
          type: "text",
          text: t(
            session.language,
            "This order was already received. Cancellation support will be added later.",
            "\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628. \u0633\u064a\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u062f\u0639\u0645 \u0627\u0644\u0625\u0644\u063a\u0627\u0621 \u0644\u0627\u062d\u0642\u0627.",
          ),
        },
      ];
    }
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "CART_MENU",
        context: { ...session.context, pendingItem: undefined, checkout: undefined },
      },
      now,
    );
    return [
      {
        type: "text",
        text: t(session.language, "Current item canceled.", "تم إلغاء المنتج الحالي."),
      },
      ...(await cartMenuResponse(nextSession)),
    ];
  }

  if (
    conversationFlow?.flow &&
    usesVisualRuntime(conversationFlow.flow) &&
    shouldHandleVisualNode(session, conversationFlow.flow)
  ) {
    const responses = await measureConversationPhase(timingContext, "handler.visual_runtime", () =>
      handleVisualRuntimeMessage(session, input, now, conversationFlow.flow, timingContext),
    );
    logConversationTotal(timingContext, processStartedAt, responses);
    return responses;
  }

  if (session.currentStep === "SELECT_LANGUAGE")
    return handleLanguageSelection(session, input, now, flowSettings);
  if (session.currentStep === "SELECT_BROWSE_GROUP")
    return handleBrowseGroupSelection(session, input, now, flowSettings);
  if (session.currentStep === "SELECT_GROUP_VALUE")
    return handleGroupValueSelection(session, input, now, flowSettings);
  if (session.currentStep === "SELECT_CATEGORY")
    return handleCategorySelection(session, input, now);
  if (session.currentStep === "SELECT_PRODUCT")
    return handleProductSelection(session, input, now, flowSettings);
  if (session.currentStep === "PRODUCT_DETAILS") return handleProductDetails(session, input, now);
  if (session.currentStep === "SELECT_PRODUCT_OPTION") {
    return handleProductOptionSelection(session, input, now);
  }
  if (session.currentStep === "COLLECT_CUSTOM_FIELD")
    return handleCustomFieldInput(session, input, now);
  if (session.currentStep === "SELECT_QUANTITY")
    return handleQuantitySelection(session, input, now);
  if (session.currentStep === "CART_MENU") return handleCartMenu(session, input, now, flowSettings);
  if (session.currentStep === "EDIT_CART_ITEM") return handleEditCartItem(session, input, now);
  if (session.currentStep === "REMOVE_CART_ITEM") return handleRemoveCartItem(session, input, now);
  if (session.currentStep === "CHANGE_CART_ITEM_QUANTITY") {
    return handleCartItemQuantityChange(session, input, now);
  }
  if (session.currentStep === "USE_SAVED_CUSTOMER_DETAILS") {
    return handleSavedCustomerDetails(session, input, now);
  }
  if (session.currentStep === "COLLECT_CUSTOMER_NAME") {
    return handleCustomerName(session, input, now);
  }
  if (session.currentStep === "SELECT_FULFILLMENT_METHOD") {
    return handleFulfillmentMethod(session, input, now);
  }
  if (session.currentStep === "SELECT_DELIVERY_AREA") {
    return handleDeliveryArea(session, input, now);
  }
  if (session.currentStep === "SELECT_PICKUP_LOCATION") {
    return handlePickupLocation(session, input, now);
  }
  if (session.currentStep === "COLLECT_DELIVERY_ADDRESS") {
    return handleDeliveryAddress(session, input, now);
  }
  if (session.currentStep === "SELECT_PAYMENT_METHOD") {
    return handlePaymentMethod(session, input, now);
  }
  if (session.currentStep === "COLLECT_ORDER_NOTES") {
    return handleOrderNotes(session, input, now);
  }
  if (session.currentStep === "REVIEW_ORDER") {
    return handleReviewOrder(session, input, now, messageId);
  }
  if (session.currentStep === "CONFIRM_ORDER") {
    return confirmOrder(session, now, messageId);
  }
  if (session.currentStep === "ORDER_CREATED") {
    return handleCompletedOrder(session, input, now, flowSettings);
  }

  return handleMainMenu(session, input, now, flowSettings);
}

async function resolveSessionFlowVersion({
  businessId,
  session,
  activeFlow,
  now,
  timingContext,
}: {
  businessId: string;
  session: ConversationSession;
  activeFlow: ActiveBusinessFlow | null;
  now: Date;
  timingContext: Omit<WhatsAppLogContext, "operation">;
}) {
  if (!session.flowVersionId) return activeFlow;
  const pinnedFlow = await measureConversationPhase(timingContext, "pinned_flow_version_load", () =>
    getBusinessFlowVersion({ businessId, versionId: session.flowVersionId as string }),
  );
  if (pinnedFlow) return pinnedFlow;

  logWhatsAppError(
    {
      ...timingContext,
      operation: "conversation.flow_version_missing",
      result: "error",
      details: { flowVersionId: session.flowVersionId },
    },
    new Error("Pinned conversation flow version was not found."),
  );
  await saveConversationSession(
    {
      ...session,
      currentNodeId: undefined,
      flowVariables: {
        ...session.flowVariables,
        missingFlowVersionId: session.flowVersionId,
        missingFlowVersionAt: now.toISOString(),
      },
    },
    now,
  );
  return null;
}

function usesVisualRuntime(flow: FlowDefinition) {
  const loaded = loadCanonicalFlowDocument(flow);
  return loaded.ok && flow.nodes.length > 0;
}

function shouldHandleVisualNode(session: ConversationSession, flow: FlowDefinition) {
  const node = findRuntimeNode(flow, session.currentNodeId ?? flow.startNodeId);
  return Boolean(
    node && visualRuntimeNodeTypes.has(node.type) && isRuntimeNodeTypeSupported(node.type),
  );
}

async function handleVisualRuntimeMessage(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
  flow: FlowDefinition,
  timingContext?: Omit<WhatsAppLogContext, "operation">,
): Promise<BotResponse[]> {
  const node = findRuntimeNode(flow, session.currentNodeId ?? flow.startNodeId);
  if (!node) return [];

  if (node.type === "LANGUAGE_SELECT") {
    const language = parseLanguage(input.value);
    if (!language) {
      await saveConversationSession({ ...session, currentStep: "SELECT_LANGUAGE" }, now);
      return [runtimeLanguageResponse(flow, session.language ?? flow.settings.defaultLanguage)];
    }
    const nextSession = await saveConversationSession(
      { ...session, language, currentStep: "SELECT_LANGUAGE", currentNodeId: node.id },
      now,
    );
    return continueFromRuntimeNode(nextSession, flow, node.id, now, timingContext);
  }

  if (node.type === "MAIN_MENU") {
    const optionKey = normalizeRuntimeOption(input.value);
    const edge = runtimeOutgoingEdges(flow, node.id).find(
      (entry) => normalizeRuntimeOption(entry.condition ?? "") === optionKey,
    );
    if (!edge) {
      await saveConversationSession(
        { ...session, currentStep: "MAIN_MENU", currentNodeId: node.id },
        now,
      );
      return [
        runtimeMainMenuResponse(flow, node, session.language ?? flow.settings.defaultLanguage),
      ];
    }
    const nextSession = await saveConversationSession(
      { ...session, currentStep: "MAIN_MENU", currentNodeId: node.id },
      now,
    );
    return enterVisualNode(nextSession, flow, edge.to, now, [], timingContext);
  }

  if (node.type === "HUMAN_HANDOFF") {
    await saveConversationSession(markHumanHandoffPaused(session, node.id, now), now);
    return [];
  }

  if (node.type === "END") {
    await saveConversationSession({ ...session, currentNodeId: node.id }, now);
    return [runtimeTextResponse(flow, node, session.language ?? flow.settings.defaultLanguage)];
  }

  return continueFromRuntimeNode(session, flow, node.id, now, timingContext);
}

async function enterVisualNode(
  session: ConversationSession,
  flow: FlowDefinition,
  nodeId: string,
  now: Date,
  carriedResponses: BotResponse[] = [],
  timingContext?: Omit<WhatsAppLogContext, "operation">,
): Promise<BotResponse[]> {
  if (carriedResponses.length >= MAX_AUTOMATIC_RUNTIME_TRANSITIONS) {
    const logContext =
      timingContext ??
      ({
        correlationId: createCorrelationId("wa_runtime"),
        businessId: session.businessId,
        customerPhone: session.customerPhone,
      } satisfies Omit<WhatsAppLogContext, "operation">);
    logWhatsAppError(
      {
        ...logContext,
        operation: "conversation.runtime_transition_limit",
        result: "error",
        details: { nodeId, limit: MAX_AUTOMATIC_RUNTIME_TRANSITIONS },
      },
      new Error("Automatic runtime transition limit exceeded."),
    );
    await timedSaveConversationSession(timingContext, "visual_transition_limit_session_save", session, now);
    return [
      ...carriedResponses,
      {
        type: "text",
        text: "This conversation could not continue safely. Please type menu or restart.",
      },
    ];
  }
  const node = findRuntimeNode(flow, nodeId);
  if (!node) {
    await timedSaveConversationSession(timingContext, "visual_missing_node_session_save", session, now);
    return carriedResponses;
  }

  const language = session.language ?? flow.settings.defaultLanguage;
  const sessionForNode =
    node.type === "HUMAN_HANDOFF" ? markHumanHandoffPaused(session, node.id, now) : session;
  const baseSession = await timedSaveConversationSession(
    timingContext,
    `visual_${node.type.toLowerCase()}_session_save`,
    {
      ...sessionForNode,
      currentNodeId: node.id,
      currentStep: runtimeStepForNode(node) ?? session.currentStep,
    },
    now,
  );

  if (node.type === "MESSAGE") {
    const response = runtimeTextResponse(flow, node, language);
    const next = firstRuntimeTarget(flow, node.id);
    if (next) {
      return enterVisualNode(baseSession, flow, next, now, [...carriedResponses, response], timingContext);
    }
    return [...carriedResponses, response];
  }

  if (node.type === "IMAGE_MESSAGE") {
    const response = runtimeImageResponse(node, language);
    const next = firstRuntimeTarget(flow, node.id);
    if (next) {
      return enterVisualNode(baseSession, flow, next, now, [...carriedResponses, response], timingContext);
    }
    return [...carriedResponses, response];
  }

  if (node.type === "LANGUAGE_SELECT") {
    return [...carriedResponses, runtimeLanguageResponse(flow, language)];
  }

  if (node.type === "MAIN_MENU") {
    return [...carriedResponses, runtimeMainMenuResponse(flow, node, language)];
  }

  if (node.type === "HUMAN_HANDOFF" || node.type === "END") {
    return [...carriedResponses, runtimeTextResponse(flow, node, language)];
  }

  return enterProtectedRuntimeNode(baseSession, flow, node, now, carriedResponses, timingContext);
}

function markHumanHandoffPaused(
  session: ConversationSession,
  nodeId: string,
  now: Date,
): ConversationSession {
  return {
    ...session,
    currentNodeId: nodeId,
    flowVariables: {
      ...session.flowVariables,
      humanHandoff: {
        status: "paused",
        nodeId,
        pausedAt:
          getRecord(session.flowVariables.humanHandoff)?.pausedAt ?? now.toISOString(),
      },
    },
  };
}

async function continueFromRuntimeNode(
  session: ConversationSession,
  flow: FlowDefinition,
  nodeId: string,
  now: Date,
  timingContext?: Omit<WhatsAppLogContext, "operation">,
) {
  const next = firstRuntimeTarget(flow, nodeId);
  if (!next) {
    await timedSaveConversationSession(timingContext, "visual_continue_session_save", session, now);
    return [] as BotResponse[];
  }
  return enterVisualNode(session, flow, next, now, [], timingContext);
}

async function enterProtectedRuntimeNode(
  session: ConversationSession,
  flow: FlowDefinition,
  node: FlowNode,
  now: Date,
  carriedResponses: BotResponse[],
  timingContext?: Omit<WhatsAppLogContext, "operation">,
): Promise<BotResponse[]> {
  const currentStep = runtimeStepForNode(node);
  const nextSession = await timedSaveConversationSession(
    timingContext,
    `protected_${node.type.toLowerCase()}_session_save`,
    { ...session, currentNodeId: node.id, currentStep: currentStep ?? session.currentStep },
    now,
  );

  if (node.type === "CATEGORY_SELECT") {
    return [
      ...carriedResponses,
      ...(await measureOptionalConversationPhase(timingContext, "response.browse_group_selection", () =>
        browseGroupSelectionResponse(nextSession, flowToBotFlowSettings(session.businessId, flow), timingContext),
      )),
    ];
  }
  if (node.type === "PRODUCT_SELECT") {
    return [
      ...carriedResponses,
      ...(await measureOptionalConversationPhase(timingContext, "response.product_selection", () =>
        productSelectionResponse(nextSession, timingContext),
      )),
    ];
  }
  if (node.type === "PRODUCT_DETAILS") {
    const product = await measureOptionalConversationPhase(
      timingContext,
      "catalog.product_details_lookup",
      () =>
        findVisibleProductById(
          nextSession.businessId,
          getContextString(nextSession.context.selectedProductId) ?? "",
        ),
    );
    if (product) {
      return [
        ...carriedResponses,
        productDetailsResponse(product, nextSession.language ?? flow.settings.defaultLanguage),
      ];
    }
    return [
      ...carriedResponses,
      ...(await measureOptionalConversationPhase(timingContext, "response.product_selection", () =>
        productSelectionResponse(nextSession, timingContext),
      )),
    ];
  }
  if (node.type === "CART_MENU") {
    return [
      ...carriedResponses,
      ...(await measureOptionalConversationPhase(timingContext, "response.cart_menu", () =>
        cartMenuResponse(nextSession),
      )),
    ];
  }
  if (node.type === "CHECKOUT") {
    return [
      ...carriedResponses,
      ...(await measureOptionalConversationPhase(timingContext, "response.start_checkout", () =>
        startCheckout(nextSession, now),
      )),
    ];
  }
  if (node.type === "ORDER_REVIEW") {
    return [
      ...carriedResponses,
      ...(await measureOptionalConversationPhase(timingContext, "response.order_review", () =>
        reviewOrderResponse(nextSession),
      )),
    ];
  }

  const fallback = runtimeTextResponse(
    flow,
    node,
    nextSession.language ?? flow.settings.defaultLanguage,
  );
  return fallback.text ? [...carriedResponses, fallback] : carriedResponses;
}

function findRuntimeNode(flow: FlowDefinition, nodeId?: string) {
  return flow.nodes.find((node) => node.id === nodeId);
}

function runtimeOutgoingEdges(flow: FlowDefinition, nodeId: string) {
  return flow.edges.filter((edge) => edge.from === nodeId);
}

function firstRuntimeTarget(flow: FlowDefinition, nodeId: string) {
  return runtimeOutgoingEdges(flow, nodeId)[0]?.to;
}

function runtimeStepForNode(node: FlowNode): ConversationStep | undefined {
  if (node.type === "LANGUAGE_SELECT") return "SELECT_LANGUAGE";
  if (node.type === "MAIN_MENU") return "MAIN_MENU";
  if (node.type === "CATEGORY_SELECT") return "SELECT_BROWSE_GROUP";
  if (node.type === "PRODUCT_SELECT") return "SELECT_PRODUCT";
  if (node.type === "PRODUCT_DETAILS") return "PRODUCT_DETAILS";
  if (node.type === "PRODUCT_OPTIONS") return "SELECT_PRODUCT_OPTION";
  if (node.type === "CUSTOM_FIELDS") return "COLLECT_CUSTOM_FIELD";
  if (node.type === "QUANTITY") return "SELECT_QUANTITY";
  if (node.type === "CART_MENU") return "CART_MENU";
  if (node.type === "CHECKOUT") return "COLLECT_CUSTOMER_NAME";
  if (node.type === "ORDER_REVIEW") return "REVIEW_ORDER";
  if (node.type === "ORDER_CONFIRMATION") return "CONFIRM_ORDER";
  return undefined;
}

function runtimeTextResponse(
  flow: FlowDefinition,
  node: FlowNode,
  language: ConversationLanguage,
): Extract<BotResponse, { type: "text" }> {
  return {
    type: "text",
    text:
      node.messages?.[language]?.trim() ||
      node.messages?.en?.trim() ||
      node.labels?.[language]?.trim() ||
      node.labels?.en?.trim() ||
      flow.copy.welcome[language] ||
      flow.copy.welcome.en,
  };
}

function runtimeImageResponse(
  node: FlowNode,
  language: ConversationLanguage,
): Extract<BotResponse, { type: "image" }> {
  const imageUrl = node.mediaUrl?.trim() || "";
  const caption =
    node.mediaCaption?.[language]?.trim() ||
    node.mediaCaption?.en?.trim() ||
    node.messages?.[language]?.trim() ||
    node.messages?.en?.trim() ||
    undefined;
  return {
    type: "image",
    imageUrl,
    caption,
  };
}

function runtimeLanguageResponse(
  flow: FlowDefinition,
  language: ConversationLanguage,
): BotResponse {
  const node = flow.nodes.find((entry) => entry.type === "LANGUAGE_SELECT");
  return {
    type: "buttons",
    body:
      node?.messages?.[language]?.trim() ||
      node?.messages?.en?.trim() ||
      t(language, "Choose your language:", "اختر لغتك:"),
    buttons: [
      { id: "language_en", title: "English" },
      { id: "language_ar", title: "العربية" },
    ],
  };
}

function runtimeMainMenuResponse(
  flow: FlowDefinition,
  node: FlowNode,
  language: ConversationLanguage,
): BotResponse {
  const buttons = runtimeOutgoingEdges(flow, node.id)
    .slice(0, 3)
    .map((edge, index) => {
      const target = findRuntimeNode(flow, edge.to);
      const option =
        node.options?.find((entry) => entry.key === edge.condition) ??
        flow.editor?.mainMenuOptions?.find((entry) => entry.key === edge.condition);
      const id = edge.condition ? `main_${edge.condition}` : `main_option_${index + 1}`;
      return {
        id,
        title: truncateButtonTitle(
          option?.label[language]?.trim() ||
            option?.label.en?.trim() ||
            target?.labels?.[language]?.trim() ||
            target?.labels?.en?.trim() ||
            target?.messages?.[language]?.trim() ||
            target?.messages?.en?.trim() ||
            edge.condition ||
            `Option ${index + 1}`,
        ),
      };
    });
  return {
    type: "buttons",
    body:
      node.messages?.[language]?.trim() ||
      node.messages?.en?.trim() ||
      flow.copy.welcome[language] ||
      flow.copy.welcome.en,
    buttons,
  };
}

function normalizeRuntimeOption(value: string) {
  return normalize(value).replace(/^main_/, "");
}

function resetBrowseContext(
  context: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
) {
  return {
    ...context,
    browseGroupPage: 0,
    groupValuePage: 0,
    categoryPage: 0,
    productPage: 0,
    selectedCatalogGroupId: undefined,
    selectedCatalogGroupValueId: undefined,
    selectedCategoryId: undefined,
    selectedProductId: undefined,
    pendingItem: undefined,
    optionIndex: undefined,
    customFieldIndex: undefined,
    ...overrides,
  };
}

async function handleLanguageSelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
  flowSettings: BusinessBotFlowSettings,
): Promise<BotResponse[]> {
  const language = parseLanguage(input.value);
  if (!language) {
    await saveConversationSession(session, now);
    return [languageSelectionResponse(flowSettings)];
  }

  await saveConversationSession({ ...session, language, currentStep: "MAIN_MENU" }, now);
  return [mainMenuResponse(language, flowSettings)];
}

async function handleMainMenu(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const option = parseMainMenuOption(input.value, flowSettings);

  if (option === "order") {
    const nextSession = await saveConversationSession(
      {
        ...session,
        language,
        currentStep: "SELECT_BROWSE_GROUP",
        context: resetBrowseContext(session.context, {
          createdOrderId: undefined,
          createdOrderNumber: undefined,
        }),
      },
      now,
    );
    return browseGroupSelectionResponse(nextSession, flowSettings);
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      language,
      currentStep: "MAIN_MENU",
      context: option ? { ...session.context, lastMenuSelection: option } : session.context,
    },
    now,
  );

  if (option === "question" || option === "info") {
    return [
      menuBranchResponse(option, language, flowSettings),
      mainMenuResponse(language, flowSettings),
    ];
  }

  if (option) {
    const response = customMenuBranchResponse(option, language, flowSettings);
    if (response) return [response, mainMenuResponse(language, flowSettings)];
  }

  return [mainMenuResponse(language, flowSettings)];
}

async function handleBrowseGroupSelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const navigation = parseNavigation(input.value);

  if (navigation === "back") {
    await saveConversationSession({ ...session, currentStep: "MAIN_MENU" }, now);
    return [mainMenuResponse(language, flowSettings)];
  }

  if (navigation === "next" || navigation === "previous") {
    const page = getPageNumber(session.context.browseGroupPage);
    const nextPage = Math.max(0, page + (navigation === "next" ? 1 : -1));
    const nextSession = await saveConversationSession(
      { ...session, context: { ...session.context, browseGroupPage: nextPage } },
      now,
    );
    return browseGroupSelectionResponse(nextSession, flowSettings);
  }

  const groups = await listConfiguredCatalogGroups(session.businessId, flowSettings);
  const selectedGroup = pickCatalogGroup(groups, input.value, language);
  if (!selectedGroup) {
    await saveConversationSession(session, now);
    return browseGroupSelectionResponse(session, flowSettings);
  }

  const nextSession = await saveConversationSession(
    {
        ...session,
        currentStep: "SELECT_GROUP_VALUE",
        context: resetBrowseContext(session.context, {
          selectedCatalogGroupId: selectedGroup.id,
        }),
      },
      now,
    );
  return groupValueSelectionResponse(nextSession, flowSettings);
}

async function handleGroupValueSelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const navigation = parseNavigation(input.value);

  if (navigation === "back") {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "SELECT_BROWSE_GROUP",
        context: resetBrowseContext(session.context),
      },
      now,
    );
    return browseGroupSelectionResponse(nextSession, flowSettings);
  }

  if (navigation === "next" || navigation === "previous") {
    const page = getPageNumber(session.context.groupValuePage);
    const nextPage = Math.max(0, page + (navigation === "next" ? 1 : -1));
    const nextSession = await saveConversationSession(
      { ...session, context: { ...session.context, groupValuePage: nextPage } },
      now,
    );
    return groupValueSelectionResponse(nextSession, flowSettings);
  }

  const groupId = getContextString(session.context.selectedCatalogGroupId);
  if (!groupId) {
    const nextSession = await saveConversationSession(
      { ...session, currentStep: "SELECT_BROWSE_GROUP" },
      now,
    );
    return browseGroupSelectionResponse(nextSession, flowSettings);
  }

  const manualProduct = await findVisibleProductByCode(session.businessId, input.value);
  if (manualProduct) return moveToProductDetails(session, manualProduct, now);

  const values = await listActiveCatalogGroupValues(session.businessId, groupId);
  const selectedValue = pickCatalogGroupValue(values, input.value, language);
  if (!selectedValue) {
    await saveConversationSession(session, now);
    return groupValueSelectionResponse(session, flowSettings);
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "SELECT_PRODUCT",
      context: {
        ...session.context,
        selectedCatalogGroupValueId: selectedValue.id,
        selectedCategoryId: selectedValue.source === "category" ? selectedValue.id : undefined,
        selectedProductId: undefined,
        productPage: 0,
      },
    },
    now,
  );
  return productSelectionResponse(nextSession);
}

async function handleCategorySelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const navigation = parseNavigation(input.value);

  if (navigation === "back") {
    await saveConversationSession({ ...session, currentStep: "MAIN_MENU" }, now);
    return [mainMenuResponse(language)];
  }

  if (navigation === "next" || navigation === "previous") {
    const page = getPageNumber(session.context.categoryPage);
    const nextPage = Math.max(0, page + (navigation === "next" ? 1 : -1));
    const nextSession = await saveConversationSession(
      { ...session, context: { ...session.context, categoryPage: nextPage } },
      now,
    );
    return categorySelectionResponse(nextSession);
  }

  const manualProduct = await findVisibleProductByCode(session.businessId, input.value);
  if (manualProduct) return moveToProductDetails(session, manualProduct, now);

  const categories = await listActiveCategories(session.businessId);
  const selectedCategory = pickCategory(categories, input.value, language);
  if (!selectedCategory) {
    await saveConversationSession(session, now);
    return categorySelectionResponse(session);
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "SELECT_PRODUCT",
      context: resetBrowseContext(session.context, {
        selectedCategoryId: selectedCategory.id,
      }),
    },
    now,
  );
  return productSelectionResponse(nextSession);
}

async function handleProductSelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): Promise<BotResponse[]> {
  const navigation = parseNavigation(input.value);

  if (navigation === "back") {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: getContextString(session.context.selectedCatalogGroupId)
          ? "SELECT_GROUP_VALUE"
          : "SELECT_CATEGORY",
        context: { ...session.context, categoryPage: 0, productPage: 0, selectedProductId: undefined },
      },
      now,
    );
    return getContextString(session.context.selectedCatalogGroupId)
      ? groupValueSelectionResponse(nextSession, flowSettings)
      : categorySelectionResponse(nextSession);
  }

  if (navigation === "next" || navigation === "previous") {
    const page = getPageNumber(session.context.productPage);
    const nextPage = Math.max(0, page + (navigation === "next" ? 1 : -1));
    const nextSession = await saveConversationSession(
      { ...session, context: { ...session.context, productPage: nextPage } },
      now,
    );
    return productSelectionResponse(nextSession);
  }

  const language = session.language ?? "en";
  const groupId = getContextString(session.context.selectedCatalogGroupId);
  const groupValueId = getContextString(session.context.selectedCatalogGroupValueId);
  const categoryId = getContextString(session.context.selectedCategoryId);
  const productByCode = await findVisibleProductByCode(session.businessId, input.value);
  const products =
    groupId && groupValueId
      ? await listVisibleProductsByGroupValue(session.businessId, groupId, groupValueId)
      : categoryId
        ? await listVisibleProductsByCategory(session.businessId, categoryId)
        : [];
  const selectedProduct =
    productByCode &&
    (groupId && groupValueId
      ? products.some((product) => product.id === productByCode.id)
      : !categoryId || productByCode.categoryId === categoryId)
      ? productByCode
      : pickProduct(products, input.value, language);

  if (!selectedProduct) {
    await saveConversationSession(session, now);
    return productSelectionResponse(session);
  }

  return moveToProductDetails(session, selectedProduct, now);
}

async function handleProductDetails(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const navigation = parseNavigation(input.value);
  const action = parseProductDetailsAction(input.value);

  if (navigation === "back" || action === "back_to_products") {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "SELECT_PRODUCT",
        context: { ...session.context, productPage: 0 },
      },
      now,
    );
    return productSelectionResponse(nextSession);
  }

  const product = await findVisibleProductById(
    session.businessId,
    getContextString(session.context.selectedProductId) ?? "",
  );

  if (action === "order_item" && product?.isAvailable)
    return startPendingItem(session, product, now);

  if (!product) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "SELECT_CATEGORY",
        context: resetBrowseContext(session.context, {
          createdOrderId: undefined,
          createdOrderNumber: undefined,
        }),
      },
      now,
    );
    return categorySelectionResponse(nextSession);
  }

  await saveConversationSession(session, now);
  return [productDetailsResponse(product, language)];
}

async function startPendingItem(
  session: ConversationSession,
  product: StoreProduct,
  now: Date,
): Promise<BotResponse[]> {
  const pendingItem: PendingItem = {
    productId: product.id,
    selectedOptionValueIds: [],
    customFieldAnswers: {},
  };
  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "SELECT_PRODUCT_OPTION",
      context: {
        ...session.context,
        pendingItem,
        optionIndex: 0,
        customFieldIndex: 0,
      },
    },
    now,
  );
  return continuePendingItem(nextSession, now);
}

async function continuePendingItem(
  session: ConversationSession,
  now: Date,
): Promise<BotResponse[]> {
  const pendingItem = getPendingItemFromContext(session.context);
  if (!pendingItem) return [mainMenuResponse(session.language ?? "en")];

  const options = await listProductOptions(session.businessId, pendingItem.productId);
  const product = await findVisibleProductById(session.businessId, pendingItem.productId);
  if (!product) return [mainMenuResponse(session.language ?? "en")];

  if (
    options.length &&
    product.variantSelectionMode === "variant_list" &&
    !pendingItem.resolvedVariantId
  ) {
    await saveConversationSession({ ...session, currentStep: "SELECT_PRODUCT_OPTION" }, now);
    return variantListResponse(session, product);
  }

  const optionIndex = getPageNumber(session.context.optionIndex);
  if (optionIndex < options.length) {
    await saveConversationSession({ ...session, currentStep: "SELECT_PRODUCT_OPTION" }, now);
    return optionQuestionResponse(session, options[optionIndex]);
  }

  const variant = options.length
    ? await resolveProductVariant({
        businessId: session.businessId,
        productId: product.id,
        selectedOptionValueIds: pendingItem.selectedOptionValueIds,
      })
    : undefined;
  if (options.length && (!variant || !variant.isAvailable || variant.stockQuantity <= 0)) {
    const language = session.language ?? "en";
    await saveConversationSession(
      {
        ...session,
        currentStep: "PRODUCT_DETAILS",
        context: {
          ...session.context,
          pendingItem: undefined,
          optionIndex: undefined,
          customFieldIndex: undefined,
        },
      },
      now,
    );
    return [unavailableCombinationResponse(language)];
  }

  const withVariant = await saveConversationSession(
    {
      ...session,
      context: {
        ...session.context,
        pendingItem: {
          ...pendingItem,
          resolvedVariantId: variant?.id,
        },
      },
    },
    now,
  );

  const fields = await listProductCustomFields(session.businessId, pendingItem.productId);
  const fieldIndex = getPageNumber(withVariant.context.customFieldIndex);
  const pendingWithVariant = getPendingItemFromContext(withVariant.context) ?? pendingItem;
  if (fieldIndex < fields.length) {
    const field = fields[fieldIndex];
    const automaticAnswer = automaticCustomFieldAnswer(field, session.language ?? "en");
    if (automaticAnswer) {
      const nextSession = await saveConversationSession(
        {
          ...withVariant,
          context: {
            ...withVariant.context,
            customFieldIndex: fieldIndex + 1,
            pendingItem: {
              ...pendingWithVariant,
              customFieldAnswers: {
                ...pendingWithVariant.customFieldAnswers,
                [field.id]: automaticAnswer,
              },
            },
          },
        },
        now,
      );
      return continuePendingItem(nextSession, now);
    }

    await saveConversationSession({ ...withVariant, currentStep: "COLLECT_CUSTOM_FIELD" }, now);
    return [customFieldQuestionResponse(withVariant, field)];
  }

  const quantitySession = await saveConversationSession(
    { ...withVariant, currentStep: "SELECT_QUANTITY" },
    now,
  );
  return quantityQuestionResponse(quantitySession);
}

async function handleProductOptionSelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const navigation = parseNavigation(input.value);
  if (navigation === "back") return backFromOption(session, now);

  const pendingItem = getPendingItemFromContext(session.context);
  if (!pendingItem) return [mainMenuResponse(session.language ?? "en")];

  const product = await findVisibleProductById(session.businessId, pendingItem.productId);
  if (!product) return [mainMenuResponse(session.language ?? "en")];

  const options = await listProductOptions(session.businessId, pendingItem.productId);
  if (options.length && product.variantSelectionMode === "variant_list") {
    const variant = await pickProductVariantFromList(session, input.value, product.id);
    if (!variant) return variantListResponse(session, product);

    const nextSession = await saveConversationSession(
      {
        ...session,
        context: {
          ...session.context,
          optionIndex: options.length,
          pendingItem: {
            ...pendingItem,
            selectedOptionValueIds: variant.selectedOptionValueIds,
            resolvedVariantId: variant.id,
          },
        },
      },
      now,
    );
    return continuePendingItem(nextSession, now);
  }

  const optionIndex = getPageNumber(session.context.optionIndex);
  const option = options[optionIndex];
  if (!option) return continuePendingItem(session, now);

  const values = await listProductOptionValues(option.id);
  const selectedValue = values.find(
    (value) =>
      value.id === input.value ||
      normalize(getOptionValueName(value, session.language ?? "en")) === normalize(input.value) ||
      normalize(value.valueEnglish) === normalize(input.value) ||
      normalize(value.valueArabic) === normalize(input.value),
  );

  if (!selectedValue) return optionQuestionResponse(session, option);

  const nextSession = await saveConversationSession(
    {
      ...session,
      context: {
        ...session.context,
        optionIndex: optionIndex + 1,
        pendingItem: {
          ...pendingItem,
          selectedOptionValueIds: [...pendingItem.selectedOptionValueIds, selectedValue.id],
        },
      },
    },
    now,
  );
  return continuePendingItem(nextSession, now);
}

async function backFromOption(session: ConversationSession, now: Date): Promise<BotResponse[]> {
  const pendingItem = getPendingItemFromContext(session.context);
  const optionIndex = getPageNumber(session.context.optionIndex);
  if (!pendingItem || optionIndex <= 0) {
    const product = await findVisibleProductById(
      session.businessId,
      pendingItem?.productId ?? getContextString(session.context.selectedProductId) ?? "",
    );
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "PRODUCT_DETAILS",
        context: { ...session.context, pendingItem: undefined },
      },
      now,
    );
    return product
      ? [productDetailsResponse(product, session.language ?? "en")]
      : [mainMenuResponse(session.language ?? "en")];
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      context: {
        ...session.context,
        optionIndex: optionIndex - 1,
        pendingItem: {
          ...pendingItem,
          selectedOptionValueIds: pendingItem.selectedOptionValueIds.slice(0, -1),
        },
      },
    },
    now,
  );
  return continuePendingItem(nextSession, now);
}

async function handleCustomFieldInput(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const navigation = parseNavigation(input.value);
  if (navigation === "back") return backFromCustomField(session, now);

  if (normalize(input.value) === "main_menu") {
    const flowSettings = await getBusinessBotFlowSettings(session.businessId);
    const language = session.language ?? flowSettings.defaultLanguage;
    await saveConversationSession(
      {
        ...session,
        language,
        currentStep: "MAIN_MENU",
        context: {
          ...session.context,
          pendingItem: undefined,
          optionIndex: undefined,
          customFieldIndex: undefined,
        },
      },
      now,
    );
    return [mainMenuResponse(language, flowSettings)];
  }

  const pendingItem = getPendingItemFromContext(session.context);
  if (!pendingItem) return [mainMenuResponse(session.language ?? "en")];

  const fields = await listProductCustomFields(session.businessId, pendingItem.productId);
  const fieldIndex = getPageNumber(session.context.customFieldIndex);
  const field = fields[fieldIndex];
  if (!field) return continuePendingItem(session, now);

  const validation = validateCustomField(field, input.value, session.language ?? "en");
  if (!validation.ok) {
    return [{ type: "text", text: validation.error }, customFieldQuestionResponse(session, field)];
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      context: {
        ...session.context,
        customFieldIndex: fieldIndex + 1,
        pendingItem: {
          ...pendingItem,
          customFieldAnswers: {
            ...pendingItem.customFieldAnswers,
            ...(validation.value ? { [field.id]: validation.value } : {}),
          },
        },
      },
    },
    now,
  );
  return continuePendingItem(nextSession, now);
}

async function backFromCustomField(
  session: ConversationSession,
  now: Date,
): Promise<BotResponse[]> {
  const fieldIndex = getPageNumber(session.context.customFieldIndex);
  if (fieldIndex <= 0) {
    const options = await listProductOptions(
      session.businessId,
      getPendingItemFromContext(session.context)?.productId ?? "",
    );
    const nextSession = await saveConversationSession(
      { ...session, currentStep: options.length ? "SELECT_PRODUCT_OPTION" : "PRODUCT_DETAILS" },
      now,
    );
    return options.length
      ? continuePendingItem(nextSession, now)
      : [mainMenuResponse(session.language ?? "en")];
  }

  const nextSession = await saveConversationSession(
    { ...session, context: { ...session.context, customFieldIndex: fieldIndex - 1 } },
    now,
  );
  return continuePendingItem(nextSession, now);
}

async function handleQuantitySelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const navigation = parseNavigation(input.value);
  if (navigation === "back") {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "COLLECT_CUSTOM_FIELD",
        context: { ...session.context, customFieldIndex: 0 },
      },
      now,
    );
    return continuePendingItem(nextSession, now);
  }

  const pendingItem = getPendingItemFromContext(session.context);
  if (!pendingItem) return [mainMenuResponse(session.language ?? "en")];

  const quantity = Number(input.value.trim());
  const stockLimit = await getStockLimit({
    businessId: session.businessId,
    productId: pendingItem.productId,
    variantId: pendingItem.resolvedVariantId,
  });
  const validationError = validateQuantity(quantity, stockLimit, session.language ?? "en");
  if (validationError)
    return [{ type: "text", text: validationError }, ...(await quantityQuestionResponse(session))];

  const product = await findVisibleProductById(session.businessId, pendingItem.productId);
  if (!product) return [mainMenuResponse(session.language ?? "en")];

  const options = await listProductOptions(session.businessId, pendingItem.productId);
  const selectedOptionLabels = await labelsForSelectedOptions(
    options,
    pendingItem,
    session.language ?? "en",
  );
  const fields = await listProductCustomFields(session.businessId, pendingItem.productId);
  const variant = pendingItem.resolvedVariantId
    ? await resolveProductVariant({
        businessId: session.businessId,
        productId: pendingItem.productId,
        selectedOptionValueIds: pendingItem.selectedOptionValueIds,
      })
    : undefined;
  const item = await buildCartItem({
    businessId: session.businessId,
    language: session.language ?? "en",
    product,
    variant,
    selectedOptionLabels,
    customFields: fields,
    pendingItem: { ...pendingItem, quantity },
  });
  const cart = [...getCartFromContext(session.context), item];
  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "CART_MENU",
      context: {
        ...session.context,
        cart,
        pendingItem: undefined,
        optionIndex: undefined,
        customFieldIndex: undefined,
      },
    },
    now,
  );

  return [
    addedToCartResponse(item, session.language ?? "en"),
    ...(await cartMenuResponse(nextSession)),
  ];
}

async function handleCartMenu(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const normalized = normalize(input.value);

  if (["cart_add_another", "add another item"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "SELECT_BROWSE_GROUP",
        context: resetBrowseContext(session.context),
      },
      now,
    );
    return browseGroupSelectionResponse(nextSession, flowSettings);
  }

  if (["cart_view", "view cart"].includes(normalized)) return cartMenuResponse(session);
  if (["cart_checkout", "checkout"].includes(normalized)) {
    return startCheckout(session, now);
  }
  if (["cart_clear", "clear cart"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      { ...session, context: { ...session.context, cart: [] } },
      now,
    );
    return [
      { type: "text", text: t(language, "Cart cleared.", "تم تفريغ السلة.") },
      ...(await cartMenuResponse(nextSession)),
    ];
  }
  if (["cart_remove", "remove item"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      { ...session, currentStep: "REMOVE_CART_ITEM" },
      now,
    );
    return removeCartItemResponse(nextSession);
  }
  if (["cart_edit", "change quantity"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      { ...session, currentStep: "EDIT_CART_ITEM" },
      now,
    );
    return editCartItemResponse(nextSession);
  }
  if (input.value.startsWith("remove_cart_item:"))
    return removeCartItemById(session, input.value.split(":")[1], now);
  if (input.value.startsWith("edit_cart_item:")) {
    const itemId = input.value.split(":")[1];
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "CHANGE_CART_ITEM_QUANTITY",
        context: { ...session.context, editingCartItemId: itemId },
      },
      now,
    );
    return quantityQuestionResponse(nextSession, itemId);
  }

  return cartMenuResponse(session);
}

async function handleEditCartItem(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  if (input.value.startsWith("edit_cart_item:")) {
    const itemId = input.value.split(":")[1];
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "CHANGE_CART_ITEM_QUANTITY",
        context: { ...session.context, editingCartItemId: itemId },
      },
      now,
    );
    return quantityQuestionResponse(nextSession, itemId);
  }
  return editCartItemResponse(session);
}

async function handleRemoveCartItem(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  if (input.value.startsWith("remove_cart_item:")) {
    return removeCartItemById(session, input.value.split(":")[1], now);
  }
  return removeCartItemResponse(session);
}

async function handleCartItemQuantityChange(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const itemId = getContextString(session.context.editingCartItemId);
  const cart = getCartFromContext(session.context);
  const item = cart.find((entry) => entry.id === itemId);
  if (!item) return cartMenuResponse(session);

  const quantity = Number(input.value.trim());
  const stockLimit = await getStockLimit({
    businessId: session.businessId,
    productId: item.productId,
    variantId: item.variantId,
  });
  const validationError = validateQuantity(quantity, stockLimit, session.language ?? "en");
  if (validationError)
    return [
      { type: "text", text: validationError },
      ...(await quantityQuestionResponse(session, item.id)),
    ];

  const nextCart = cart.map((entry) =>
    entry.id === item.id ? { ...entry, quantity, lineTotal: entry.unitPrice * quantity } : entry,
  );
  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "CART_MENU",
      context: { ...session.context, cart: nextCart, editingCartItemId: undefined },
    },
    now,
  );
  return [
    { type: "text", text: t(session.language ?? "en", "Quantity updated.", "تم تحديث الكمية.") },
    ...(await cartMenuResponse(nextSession)),
  ];
}

async function removeCartItemById(
  session: ConversationSession,
  itemId: string | undefined,
  now: Date,
): Promise<BotResponse[]> {
  const cart = getCartFromContext(session.context);
  const nextCart = cart.filter((item) => item.id !== itemId);
  const nextSession = await saveConversationSession(
    { ...session, currentStep: "CART_MENU", context: { ...session.context, cart: nextCart } },
    now,
  );
  return [
    { type: "text", text: t(session.language ?? "en", "Item removed.", "تم حذف المنتج.") },
    ...(await cartMenuResponse(nextSession)),
  ];
}

async function startCheckout(session: ConversationSession, now: Date): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const cart = getCartFromContext(session.context);
  const settings = await getBusinessCheckoutSettings(session.businessId);
  if (!settings) {
    await saveConversationSession(session, now);
    return [
      {
        type: "text",
        text: t(
          language,
          "Checkout is not configured for this store yet.",
          "\u0627\u0644\u062f\u0641\u0639 \u063a\u064a\u0631 \u0645\u0639\u062f \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u062a\u062c\u0631 \u0628\u0639\u062f.",
        ),
      },
    ];
  }

  const validation = await validateCartForOrder({ businessId: session.businessId, cart });
  if (!validation.ok) {
    await saveConversationSession(session, now);
    return [
      stockChangedResponse(language, validation.itemName),
      ...(await cartMenuResponse(session)),
    ];
  }

  const subtotal = calculateCart(validation.cart).subtotal;
  if (subtotal < settings.minimumOrderAmount) {
    await saveConversationSession(session, now);
    return [
      {
        type: "text",
        text: t(
          language,
          `Minimum order amount is ${formatPrice(settings.minimumOrderAmount)}.`,
          `\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0644\u0644\u0637\u0644\u0628 ${formatPrice(settings.minimumOrderAmount)}.`,
        ),
      },
    ];
  }

  const customerProfile = await getWhatsAppCustomerProfile({
    businessId: session.businessId,
    customerPhone: session.customerPhone,
  });
  const reusableCheckout = customerProfile
    ? getReusableCheckoutFromProfile(customerProfile, settings)
    : undefined;
  const flowSettings = await getBusinessBotFlowSettings(session.businessId);
  if (customerProfile && reusableCheckout) {
    if (flowSettings.autoUseSavedCheckoutDetails) {
      const nextSession = await saveConversationSession(
        {
          ...session,
          currentStep: "REVIEW_ORDER",
          context: {
            ...session.context,
            cart: validation.cart,
            checkout: reusableCheckout,
            savedCheckout: undefined,
            savedCustomerProfile: undefined,
            createdOrderId: undefined,
            createdOrderNumber: undefined,
          },
        },
        now,
      );

      return reviewOrderResponse(nextSession);
    }

    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "USE_SAVED_CUSTOMER_DETAILS",
        context: {
          ...session.context,
          cart: validation.cart,
          checkout: {},
          savedCheckout: reusableCheckout,
          savedCustomerProfile: customerProfile,
          createdOrderId: undefined,
          createdOrderNumber: undefined,
        },
      },
      now,
    );

    return [savedCustomerDetailsQuestion(nextSession, settings, customerProfile)];
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "COLLECT_CUSTOMER_NAME",
      context: {
        ...session.context,
        cart: validation.cart,
        checkout: {},
        createdOrderId: undefined,
        createdOrderNumber: undefined,
      },
    },
    now,
  );

  return [customerNameQuestion(nextSession, flowSettings)];
}

async function handleSavedCustomerDetails(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const normalized = normalize(input.value);

  if (["saved_details_use", "use saved", "yes"].includes(normalized)) {
    const savedCheckout = getSavedCheckoutFromContext(session.context);
    if (!savedCheckout) {
      return startCheckout(
        { ...session, context: { ...session.context, savedCheckout: undefined } },
        now,
      );
    }

    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "REVIEW_ORDER",
        context: {
          ...session.context,
          checkout: savedCheckout,
          savedCheckout: undefined,
          savedCustomerProfile: undefined,
        },
      },
      now,
    );

    return reviewOrderResponse(nextSession);
  }

  if (["saved_details_change", "change", "no"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "COLLECT_CUSTOMER_NAME",
        context: {
          ...session.context,
          checkout: {},
          savedCheckout: undefined,
          savedCustomerProfile: undefined,
        },
      },
      now,
    );

    const flowSettings = await getBusinessBotFlowSettings(session.businessId);
    return [customerNameQuestion(nextSession, flowSettings)];
  }

  await saveConversationSession(session, now);
  return [
    {
      type: "text",
      text: t(
        language,
        "Choose whether to use the saved details or change them.",
        "\u0627\u062e\u062a\u0631 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629 \u0623\u0648 \u062a\u063a\u064a\u064a\u0631\u0647\u0627.",
      ),
    },
  ];
}

async function handleCustomerName(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const customerName = input.value.trim();
  if (customerName.length < 2) {
    await saveConversationSession(session, now);
    return [
      {
        type: "text",
        text: t(
          language,
          "Please send the customer name for this order.",
          "\u0623\u0631\u0633\u0644 \u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064a\u0644 \u0644\u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628.",
        ),
      },
    ];
  }

  const settings = await getBusinessCheckoutSettings(session.businessId);
  if (!settings) return startCheckout(session, now);

  return continueCheckoutAfterCustomerName(
    {
      ...session,
      context: {
        ...session.context,
        checkout: { ...getCheckoutFromContext(session.context), customerName },
      },
    },
    settings,
    now,
  );
}

async function continueCheckoutAfterCustomerName(
  session: ConversationSession,
  settings: BusinessCheckoutSettings,
  now: Date,
): Promise<BotResponse[]> {
  const flowSettings = await getBusinessBotFlowSettings(session.businessId);
  const singleFulfillmentMethod = getSingleFulfillmentMethod(settings);

  if (flowSettings.skipFulfillmentWhenSingleOption && singleFulfillmentMethod) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep:
          singleFulfillmentMethod === "delivery"
            ? "SELECT_DELIVERY_AREA"
            : "SELECT_PICKUP_LOCATION",
        context: {
          ...session.context,
          checkout: {
            ...getCheckoutFromContext(session.context),
            fulfillmentMethod: singleFulfillmentMethod,
          },
        },
      },
      now,
    );
    return continueCheckoutAfterFulfillmentMethod(nextSession, settings, now);
  }

  const nextSession = await saveConversationSession(
    { ...session, currentStep: "SELECT_FULFILLMENT_METHOD" },
    now,
  );
  return [fulfillmentMethodQuestion(nextSession, flowSettings)];
}

async function handleFulfillmentMethod(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const settings = await getBusinessCheckoutSettings(session.businessId);
  if (!settings) return startCheckout(session, now);

  const normalized = normalize(input.value);
  const fulfillmentMethod =
    ["checkout_delivery", "delivery"].includes(normalized) && settings.allowDelivery
      ? "delivery"
      : ["checkout_pickup", "pickup"].includes(normalized) && settings.allowPickup
        ? "pickup"
        : undefined;

  if (!fulfillmentMethod) {
    const flowSettings = await getBusinessBotFlowSettings(session.businessId);
    return [fulfillmentMethodQuestion(session, flowSettings)];
  }

  const checkout = { ...getCheckoutFromContext(session.context), fulfillmentMethod };
  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep:
        fulfillmentMethod === "delivery" ? "SELECT_DELIVERY_AREA" : "SELECT_PICKUP_LOCATION",
      context: { ...session.context, checkout },
    },
    now,
  );

  return continueCheckoutAfterFulfillmentMethod(nextSession, settings, now);
}

async function continueCheckoutAfterFulfillmentMethod(
  session: ConversationSession,
  settings: BusinessCheckoutSettings,
  now: Date,
): Promise<BotResponse[]> {
  const flowSettings = await getBusinessBotFlowSettings(session.businessId);
  const checkout = getCheckoutFromContext(session.context);

  if (checkout.fulfillmentMethod === "delivery") {
    if (flowSettings.skipDeliveryAreaWhenSingleOption && settings.deliveryAreas.length === 1) {
      const [deliveryArea] = settings.deliveryAreas;
      const nextSession = await saveConversationSession(
        {
          ...session,
          currentStep: "COLLECT_DELIVERY_ADDRESS",
          context: {
            ...session.context,
            checkout: { ...checkout, deliveryAreaId: deliveryArea.id },
          },
        },
        now,
      );
      return [deliveryAddressQuestion(nextSession, flowSettings)];
    }

    const nextSession = await saveConversationSession(
      { ...session, currentStep: "SELECT_DELIVERY_AREA" },
      now,
    );
    return [deliveryAreaQuestion(nextSession, settings, flowSettings)];
  }

  if (checkout.fulfillmentMethod === "pickup") {
    if (flowSettings.skipPickupLocationWhenSingleOption && settings.pickupLocations.length === 1) {
      const [pickupLocation] = settings.pickupLocations;
      const nextSession = await saveConversationSession(
        {
          ...session,
          currentStep: "SELECT_PAYMENT_METHOD",
          context: {
            ...session.context,
            checkout: { ...checkout, pickupLocationId: pickupLocation.id },
          },
        },
        now,
      );
      return continueCheckoutAfterFulfillmentTarget(nextSession, settings, now);
    }

    const nextSession = await saveConversationSession(
      { ...session, currentStep: "SELECT_PICKUP_LOCATION" },
      now,
    );
    return [pickupLocationQuestion(nextSession, settings, flowSettings)];
  }

  return continueCheckoutAfterCustomerName(session, settings, now);
}

async function continueCheckoutAfterFulfillmentTarget(
  session: ConversationSession,
  settings: BusinessCheckoutSettings,
  now: Date,
): Promise<BotResponse[]> {
  const flowSettings = await getBusinessBotFlowSettings(session.businessId);
  const checkout = getCheckoutFromContext(session.context);
  const paymentMethods = getAvailablePaymentMethods(settings, checkout.fulfillmentMethod);

  if (flowSettings.skipPaymentWhenSingleOption && paymentMethods.length === 1) {
    const [paymentMethod] = paymentMethods;
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "COLLECT_ORDER_NOTES",
        context: {
          ...session.context,
          checkout: { ...checkout, paymentMethod: paymentMethod.id },
        },
      },
      now,
    );
    return continueCheckoutAfterPaymentMethod(nextSession, settings, now);
  }

  const nextSession = await saveConversationSession(
    { ...session, currentStep: "SELECT_PAYMENT_METHOD" },
    now,
  );
  return [paymentMethodQuestion(nextSession, settings, flowSettings)];
}

async function continueCheckoutAfterPaymentMethod(
  session: ConversationSession,
  settings: BusinessCheckoutSettings,
  now: Date,
): Promise<BotResponse[]> {
  const flowSettings = await getBusinessBotFlowSettings(session.businessId);
  if (!flowSettings.orderNotesEnabled) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "REVIEW_ORDER",
        context: {
          ...session.context,
          checkout: { ...getCheckoutFromContext(session.context), notes: undefined },
        },
      },
      now,
    );
    return reviewOrderResponse(nextSession);
  }

  const nextSession = await saveConversationSession(
    { ...session, currentStep: "COLLECT_ORDER_NOTES" },
    now,
  );
  return [orderNotesQuestion(nextSession, flowSettings)];
}

async function handleDeliveryArea(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const settings = await getBusinessCheckoutSettings(session.businessId);
  if (!settings) return startCheckout(session, now);

  const area = settings.deliveryAreas.find((entry) => entry.id === input.value);
  if (!area) {
    const flowSettings = await getBusinessBotFlowSettings(session.businessId);
    return [deliveryAreaQuestion(session, settings, flowSettings)];
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "COLLECT_DELIVERY_ADDRESS",
      context: {
        ...session.context,
        checkout: { ...getCheckoutFromContext(session.context), deliveryAreaId: area.id },
      },
    },
    now,
  );

  const flowSettings = await getBusinessBotFlowSettings(session.businessId);
  return [deliveryAddressQuestion(nextSession, flowSettings)];
}

async function handlePickupLocation(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const settings = await getBusinessCheckoutSettings(session.businessId);
  if (!settings) return startCheckout(session, now);

  const pickupLocation = settings.pickupLocations.find((entry) => entry.id === input.value);
  if (!pickupLocation) {
    const flowSettings = await getBusinessBotFlowSettings(session.businessId);
    return [pickupLocationQuestion(session, settings, flowSettings)];
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "SELECT_PAYMENT_METHOD",
      context: {
        ...session.context,
        checkout: {
          ...getCheckoutFromContext(session.context),
          pickupLocationId: pickupLocation.id,
        },
      },
    },
    now,
  );

  return continueCheckoutAfterFulfillmentTarget(nextSession, settings, now);
}

async function handleDeliveryAddress(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const settings = await getBusinessCheckoutSettings(session.businessId);
  if (!settings) return startCheckout(session, now);
  const flowSettings = await getBusinessBotFlowSettings(session.businessId);

  const address =
    input.type === "location" ? input.value || "WhatsApp location" : input.value.trim();
  if (input.type !== "text" && input.type !== "location") {
    await saveConversationSession(session, now);
    return [
      {
        type: "text",
        text: t(
          language,
          "Please send the delivery address as text or a WhatsApp location.",
          "\u0623\u0631\u0633\u0644 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0643\u0646\u0635 \u0623\u0648 \u0645\u0648\u0642\u0639 \u0648\u0627\u062a\u0633\u0627\u0628.",
        ),
      },
      deliveryAddressQuestion(session, flowSettings),
    ];
  }
  if (address.length < 4) {
    await saveConversationSession(session, now);
    return [
      {
        type: "text",
        text: t(
          language,
          "Please send a more complete delivery address.",
          "\u0623\u0631\u0633\u0644 \u0639\u0646\u0648\u0627\u0646\u0627 \u0623\u0648\u0636\u062d \u0644\u0644\u062a\u0648\u0635\u064a\u0644.",
        ),
      },
    ];
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "SELECT_PAYMENT_METHOD",
      context: {
        ...session.context,
        checkout: {
          ...getCheckoutFromContext(session.context),
          deliveryAddress: address,
          deliveryLatitude: input.latitude,
          deliveryLongitude: input.longitude,
        },
      },
    },
    now,
  );

  return continueCheckoutAfterFulfillmentTarget(nextSession, settings, now);
}

async function handlePaymentMethod(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const settings = await getBusinessCheckoutSettings(session.businessId);
  if (!settings) return startCheckout(session, now);

  const checkout = getCheckoutFromContext(session.context);
  const paymentMethod = settings.paymentMethods.find(
    (method) =>
      method.id === input.value &&
      checkout.fulfillmentMethod &&
      method.fulfillmentMethods.includes(checkout.fulfillmentMethod),
  );
  if (!paymentMethod) {
    const flowSettings = await getBusinessBotFlowSettings(session.businessId);
    return [paymentMethodQuestion(session, settings, flowSettings)];
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "COLLECT_ORDER_NOTES",
      context: {
        ...session.context,
        checkout: { ...checkout, paymentMethod: paymentMethod.id },
      },
    },
    now,
  );

  return continueCheckoutAfterPaymentMethod(nextSession, settings, now);
}

async function handleOrderNotes(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const normalized = normalize(input.value);
  const notes = ["no_notes", "no notes", "none", "skip"].includes(normalized)
    ? undefined
    : input.value.trim();
  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "REVIEW_ORDER",
      context: {
        ...session.context,
        checkout: { ...getCheckoutFromContext(session.context), notes },
      },
    },
    now,
  );

  return reviewOrderResponse(nextSession);
}

async function handleReviewOrder(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
  messageId: string,
): Promise<BotResponse[]> {
  const normalized = normalize(input.value);

  if (["confirm_order", "confirm order", "confirm"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      { ...session, currentStep: "CONFIRM_ORDER" },
      now,
    );
    return confirmOrder(nextSession, now, messageId);
  }

  if (["edit_cart", "cart_edit", "edit cart"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "CART_MENU",
        context: { ...session.context, checkout: undefined },
      },
      now,
    );
    return cartMenuResponse(nextSession);
  }

  if (["cancel_checkout", "cancel checkout", "cancel"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "CART_MENU",
        context: { ...session.context, checkout: undefined },
      },
      now,
    );
    return [
      {
        type: "text",
        text: t(
          session.language ?? "en",
          "Checkout canceled. Your cart is still available.",
          "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062f\u0641\u0639. \u0633\u0644\u062a\u0643 \u0645\u0627 \u0632\u0627\u0644\u062a \u0645\u062a\u0627\u062d\u0629.",
        ),
      },
      ...(await cartMenuResponse(nextSession)),
    ];
  }

  return reviewOrderResponse(session);
}

async function confirmOrder(
  session: ConversationSession,
  now: Date,
  messageId: string,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const createdOrder = getContextString(session.context.createdOrderNumber);
  if (createdOrder) {
    await saveConversationSession({ ...session, currentStep: "ORDER_CREATED" }, now);
    return [
      {
        type: "text",
        text: t(
          language,
          `This order was already received.\n\nOrder: ${createdOrder}`,
          `\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0645\u0633\u0628\u0642\u0627.\n\n\u0627\u0644\u0637\u0644\u0628: ${createdOrder}`,
        ),
      },
    ];
  }

  const settings = await getBusinessCheckoutSettings(session.businessId);
  if (!settings) return startCheckout(session, now);

  const result = await createPendingOrder({
    businessId: session.businessId,
    customerPhone: session.customerPhone,
    language,
    cart: getCartFromContext(session.context),
    checkout: getCheckoutFromContext(session.context),
    settings,
    idempotencyKey: `${session.businessId}:${session.customerPhone}:${messageId}`,
    now,
  });

  if (!result.ok) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "CART_MENU",
        context: { ...session.context, checkout: undefined },
      },
      now,
    );
    return [
      stockChangedResponse(language, result.itemName),
      ...(await cartMenuResponse(nextSession)),
    ];
  }

  await saveWhatsAppCustomerProfileFromOrder(result.order);
  if (!result.duplicate) {
    void createOwnerNewOrderNotifications(result.order);
  }

  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "ORDER_CREATED",
      context: {
        ...session.context,
        cart: [],
        checkout: undefined,
        pendingItem: undefined,
        createdOrderId: result.order.id,
        createdOrderNumber: result.order.orderNumber,
      },
    },
    now,
  );

  return [orderCreatedResponse(result.order, settings, nextSession)];
}

async function handleCompletedOrder(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): Promise<BotResponse[]> {
  const normalized = normalize(input.value);
  if (["cart_add_another", "new order", "place an order"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "SELECT_BROWSE_GROUP",
        context: resetBrowseContext(session.context, {
          cart: [],
          checkout: undefined,
          createdOrderId: undefined,
          createdOrderNumber: undefined,
        }),
      },
      now,
    );
    return browseGroupSelectionResponse(nextSession, flowSettings);
  }

  await saveConversationSession(session, now);
  return [
    {
      type: "buttons",
      body: t(
        session.language ?? "en",
        "Your order was received. You can start another order from the menu.",
        "\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0637\u0644\u0628\u0643. \u064a\u0645\u0643\u0646\u0643 \u0628\u062f\u0621 \u0637\u0644\u0628 \u0622\u062e\u0631 \u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629.",
      ),
      buttons: [
        { id: "main_menu", title: t(session.language ?? "en", "Main menu", "القائمة") },
        { id: "cart_add_another", title: t(session.language ?? "en", "New order", "طلب جديد") },
      ],
    },
  ];
}

async function moveToProductDetails(
  session: ConversationSession,
  product: StoreProduct,
  now: Date,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const nextSession = await saveConversationSession(
    {
      ...session,
      currentStep: "PRODUCT_DETAILS",
      context: {
        ...session.context,
        selectedCategoryId: product.categoryId,
        selectedProductId: product.id,
      },
    },
    now,
  );

  const flowSettings = await getBusinessBotFlowSettings(session.businessId);
  if (product.isAvailable && !flowSettings.showProductDetailsBeforeOrdering) {
    return startPendingItem(nextSession, product, now);
  }

  return [productDetailsResponse(product, language)];
}

function languageSelectionResponse(flowSettings = getDefaultBotFlowSettings("")): BotResponse {
  const body =
    flowSettings.defaultLanguage === "ar"
      ? flowSettings.languagePromptArabic || flowSettings.languagePromptEnglish
      : flowSettings.languagePromptEnglish || flowSettings.languagePromptArabic;
  return {
    type: "buttons",
    body: body || "Choose your language:",
    buttons: [
      { id: "language_en", title: "English" },
      { id: "language_ar", title: "العربية" },
    ],
  };
}

function menuBranchResponse(
  option: "question" | "info",
  language: ConversationLanguage,
  flowSettings: BusinessBotFlowSettings,
): BotResponse {
  const text =
    option === "question"
      ? language === "ar"
        ? flowSettings.questionResponseArabic
        : flowSettings.questionResponseEnglish
      : language === "ar"
        ? flowSettings.infoResponseArabic
        : flowSettings.infoResponseEnglish;

  return { type: "text", text };
}

function customMenuBranchResponse(
  optionKey: string,
  language: ConversationLanguage,
  flowSettings: BusinessBotFlowSettings,
): BotResponse | undefined {
  const option = flowSettings.mainMenuOptions?.find((entry) => entry.key === optionKey);
  if (!option?.targetNodeId) return undefined;
  if (["category_select", "products", "product_select"].includes(option.targetNodeId)) {
    return undefined;
  }
  if (option.targetNodeId === "human_handoff") {
    return {
      type: "text",
      text:
        language === "ar"
          ? flowSettings.questionResponseArabic
          : flowSettings.questionResponseEnglish,
    };
  }
  if (option.targetNodeId === "store_info") {
    return {
      type: "text",
      text: language === "ar" ? flowSettings.infoResponseArabic : flowSettings.infoResponseEnglish,
    };
  }
  if (option.response?.en || option.response?.ar) {
    return {
      type: "text",
      text: option.response[language] || option.response.en || "",
    };
  }
  return {
    type: "text",
    text: option.label[language] || option.label.en,
  };
}

function mainMenuResponse(
  language: ConversationLanguage,
  flowSettings = getDefaultBotFlowSettings(""),
): BotResponse {
  const configuredOptions = flowSettings.mainMenuOptions
    ?.filter((option) => option.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3);
  const buttons = configuredOptions?.length
    ? configuredOptions.map((option) => ({
        id: `main_${option.key}`,
        title: truncateButtonTitle(option.label[language] || option.label.en),
      }))
    : [
        {
          id: "main_order",
          title: truncateButtonTitle(
            language === "ar" ? flowSettings.orderButtonArabic : flowSettings.orderButtonEnglish,
          ),
        },
        {
          id: "main_question",
          title: truncateButtonTitle(
            language === "ar"
              ? flowSettings.questionButtonArabic
              : flowSettings.questionButtonEnglish,
          ),
        },
        {
          id: "main_info",
          title: truncateButtonTitle(
            language === "ar" ? flowSettings.infoButtonArabic : flowSettings.infoButtonEnglish,
          ),
        },
      ];
  return {
    type: "buttons",
    body:
      language === "ar" ? flowSettings.welcomeMessageArabic : flowSettings.welcomeMessageEnglish,
    buttons,
  };
}
async function categorySelectionResponse(session: ConversationSession): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const categories = await listActiveCategories(session.businessId);
  const page = getValidPage(getPageNumber(session.context.categoryPage), categories.length);
  const rows = categories.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((category) => ({
    id: category.id,
    title: getCategoryName(category, language),
  }));

  return [
    {
      type: "list",
      body: t(language, "Choose a category:", "اختر فئة:"),
      buttonText: t(language, "Categories", "الفئات"),
      sections: [
        {
          title: t(language, "Categories", "الفئات"),
          rows: [...rows, ...getNavigationRows(page, categories.length, language)],
        },
      ],
    },
  ];
}

async function listConfiguredCatalogGroups(
  businessId: string,
  flowSettings: BusinessBotFlowSettings,
  timingContext?: Omit<WhatsAppLogContext, "operation">,
): Promise<StoreCatalogGroup[]> {
  const groups = await measureOptionalConversationPhase(timingContext, "catalog.active_groups_load", () =>
    listActiveCatalogGroups(businessId),
  );
  const configuredRoutes = (flowSettings.browseRoutes ?? [])
    .filter((route) => route.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (!configuredRoutes.length) return groups;

  const configuredGroups: StoreCatalogGroup[] = [];
  for (const route of configuredRoutes) {
    const group =
      route.source === "categories"
        ? groups.find((entry) => entry.source === "category")
        : groups.find(
            (entry) =>
              entry.source === "custom" &&
              (entry.slug === route.groupSlug || entry.slug === route.key || entry.id === route.key),
          );
    if (!group) continue;
    configuredGroups.push({
      ...group,
      nameEnglish: route.label.en.trim() || group.nameEnglish,
      nameArabic: route.label.ar.trim() || route.label.en.trim() || group.nameArabic,
      sortOrder: route.sortOrder,
    });
  }

  return configuredGroups.length ? configuredGroups : groups;
}

async function browseGroupSelectionResponse(
  session: ConversationSession,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
  timingContext?: Omit<WhatsAppLogContext, "operation">,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const groups = await listConfiguredCatalogGroups(session.businessId, flowSettings, timingContext);
  if (groups.length <= 1) {
    const group = groups[0];
    if (!group) return categorySelectionResponse(session);
    const nextSession = await timedSaveConversationSession(
      timingContext,
      "browse_single_group_session_save",
      {
        ...session,
        currentStep: "SELECT_GROUP_VALUE",
        context: resetBrowseContext(session.context, { selectedCatalogGroupId: group.id }),
      },
      new Date(),
    );
    return groupValueSelectionResponse(nextSession, flowSettings, timingContext);
  }

  const page = getValidPage(getPageNumber(session.context.browseGroupPage), groups.length);
  const rows = groups.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((group) => ({
    id: group.id,
    title: truncateListTitle(getCatalogGroupName(group, language)),
  }));

  return [
    {
      type: "list",
      body: t(language, "How would you like to browse?", "كيف تريد التصفح؟"),
      buttonText: t(language, "Browse", "تصفح"),
      sections: [
        {
          title: t(language, "Browse by", "تصفح حسب"),
          rows: [...rows, ...getNavigationRows(page, groups.length, language)],
        },
      ],
    },
  ];
}

async function groupValueSelectionResponse(
  session: ConversationSession,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
  timingContext?: Omit<WhatsAppLogContext, "operation">,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const groupId = getContextString(session.context.selectedCatalogGroupId);
  const groups = await listConfiguredCatalogGroups(session.businessId, flowSettings, timingContext);
  const group = groupId ? groups.find((entry) => entry.id === groupId) : undefined;
  if (!groupId || !group) return browseGroupSelectionResponse(session, flowSettings, timingContext);

  const values = await measureOptionalConversationPhase(
    timingContext,
    "catalog.group_values_load",
    () => listActiveCatalogGroupValues(session.businessId, groupId),
  );
  const page = getValidPage(getPageNumber(session.context.groupValuePage), values.length);
  const rows = values.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((value) => ({
    id: value.id,
    title: truncateListTitle(getCatalogGroupValueName(value, language)),
  }));
  const groupName = getCatalogGroupName(group, language);

  return [
    {
      type: "list",
      body: t(language, `Choose ${groupName}:`, `اختر ${groupName}:`),
      buttonText: truncateButtonTitle(groupName),
      sections: [
        {
          title: truncateListTitle(groupName),
          rows: [...rows, ...getNavigationRows(page, values.length, language)],
        },
      ],
    },
  ];
}

async function productSelectionResponse(
  session: ConversationSession,
  timingContext?: Omit<WhatsAppLogContext, "operation">,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const groupId = getContextString(session.context.selectedCatalogGroupId);
  const groupValueId = getContextString(session.context.selectedCatalogGroupValueId);
  const groupValue =
    groupId && groupValueId
      ? (
          await measureOptionalConversationPhase(
            timingContext,
            "catalog.product_context_group_values_load",
            () => listActiveCatalogGroupValues(session.businessId, groupId),
          )
        ).find((value) => value.id === groupValueId)
      : undefined;
  const categoryId = getContextString(session.context.selectedCategoryId);
  const category = categoryId
    ? await measureOptionalConversationPhase(timingContext, "catalog.category_lookup", () =>
        findActiveCategoryById(session.businessId, categoryId),
      )
    : undefined;
  const products =
    groupId && groupValueId
      ? await measureOptionalConversationPhase(timingContext, "catalog.products_by_group_value_load", () =>
          listVisibleProductsByGroupValue(session.businessId, groupId, groupValueId),
        )
      : categoryId
        ? await measureOptionalConversationPhase(timingContext, "catalog.products_by_category_load", () =>
            listVisibleProductsByCategory(session.businessId, categoryId),
          )
        : [];
  const browseName = groupValue
    ? getCatalogGroupValueName(groupValue, language)
    : category
      ? getCategoryName(category, language)
      : "";
  const page = getValidPage(getPageNumber(session.context.productPage), products.length);
  const rows = products.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((product) => ({
    id: product.id,
    title: truncateListTitle(`${product.code} ${getProductName(product, language)}`),
    description: `${formatPrice(product.price)} - ${getAvailabilityLabel(product, language)}`,
  }));

  return [
    {
      type: "list",
      body: t(
        language,
        `Choose a product from ${browseName}:`,
        `اختر منتجا من ${browseName}:`,
      ),
      buttonText: t(language, "Products", "المنتجات"),
      sections: [
        {
          title: t(language, "Products", "المنتجات"),
          rows: [...rows, ...getNavigationRows(page, products.length, language, true)],
        },
      ],
    },
  ];
}

function productDetailsResponse(
  product: StoreProduct,
  language: ConversationLanguage,
): BotResponse {
  const body = t(
    language,
    `${getProductName(product, language)}\n\nCode: ${product.code}\nPrice: ${formatPrice(product.price)}\n${getAvailabilityLabel(product, language)}\n\n${getProductDescription(product, language)}`,
    `${getProductName(product, language)}\n\nالرمز: ${product.code}\nالسعر: ${formatPrice(product.price)}\n${getAvailabilityLabel(product, language)}\n\n${getProductDescription(product, language)}`,
  );

  return {
    type: "buttons",
    body,
    buttons: product.isAvailable
      ? [
          { id: "product_order", title: t(language, "Order this item", "اطلب المنتج") },
          { id: "product_back", title: t(language, "Back to products", "رجوع") },
          { id: "main_menu", title: t(language, "Main menu", "القائمة") },
        ]
      : [
          { id: "product_back", title: t(language, "Back to products", "رجوع") },
          { id: "main_menu", title: t(language, "Main menu", "القائمة") },
        ],
  };
}

async function optionQuestionResponse(
  session: ConversationSession,
  option: StoreProductOption | undefined,
): Promise<BotResponse[]> {
  if (!option) return [mainMenuResponse(session.language ?? "en")];
  const language = session.language ?? "en";
  const values = await listProductOptionValues(option.id);
  const pendingItem = getPendingItemFromContext(session.context);
  const allOptions = pendingItem
    ? await listProductOptions(session.businessId, pendingItem.productId)
    : [];
  const isFinalOption =
    allOptions.findIndex((entry) => entry.id === option.id) === allOptions.length - 1;
  const valueRows = await Promise.all(
    values.map(async (value) => {
      const variant =
        pendingItem && isFinalOption
          ? await resolveProductVariant({
              businessId: session.businessId,
              productId: pendingItem.productId,
              selectedOptionValueIds: [...pendingItem.selectedOptionValueIds, value.id],
            })
          : undefined;

      if (variant && (!variant.isAvailable || variant.stockQuantity <= 0)) return undefined;

      const name = getOptionValueName(value, language);
      const price = variant ? ` - ${formatPrice(variant.price)}` : "";
      const row = {
        id: value.id,
        title: truncateListTitle(`${name}${price}`),
      };
      if (!variant) return row;
      return {
        ...row,
        description: t(
          language,
          `${variant.stockQuantity} available`,
          `\u0627\u0644\u0645\u062a\u0648\u0641\u0631: ${variant.stockQuantity}`,
        ),
      };
    }),
  );
  const rows = valueRows.filter((row): row is { id: string; title: string; description?: string } =>
    Boolean(row),
  );

  return [
    {
      type: "list",
      body: t(
        language,
        `Choose ${getOptionName(option, language)}:`,
        `\u0627\u062e\u062a\u0631 ${getOptionName(option, language)}:`,
      ),
      buttonText: getOptionName(option, language).slice(0, 20),
      sections: [
        {
          title: getOptionName(option, language),
          rows: [
            ...rows,
            { id: "back", title: t(language, "Back", "\u0631\u062c\u0648\u0639") },
            {
              id: "main_menu",
              title: t(language, "Main menu", "\u0627\u0644\u0642\u0627\u0626\u0645\u0629"),
            },
          ],
        },
      ],
    },
  ];
}

async function variantListResponse(
  session: ConversationSession,
  product: StoreProduct,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const variants = await availableProductVariants(session.businessId, product.id);
  const rows = await Promise.all(
    variants.map(async (variant) => {
      const label = await variantChoiceLabel(variant, language);
      return {
        id: variant.id,
        title: truncateListTitle(`${label} - ${formatPrice(variant.price)}`),
        description: t(
          language,
          `${variant.stockQuantity} available`,
          `\u0627\u0644\u0645\u062a\u0648\u0641\u0631: ${variant.stockQuantity}`,
        ),
      };
    }),
  );

  if (!rows.length) {
    return [unavailableCombinationResponse(language)];
  }

  return [
    {
      type: "list",
      body: t(
        language,
        `Choose the exact ${getProductName(product, language)} option you want:`,
        `\u0627\u062e\u062a\u0631 \u062e\u064a\u0627\u0631 ${getProductName(product, language)} \u0627\u0644\u0645\u0637\u0644\u0648\u0628:`,
      ),
      buttonText: t(language, "Variants", "\u0627\u0644\u062e\u064a\u0627\u0631\u0627\u062a"),
      sections: [
        {
          title: t(language, "Available options", "\u0627\u0644\u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u062a\u0648\u0641\u0631\u0629"),
          rows: [
            ...rows,
            { id: "back", title: t(language, "Back", "\u0631\u062c\u0648\u0639") },
            {
              id: "main_menu",
              title: t(language, "Main menu", "\u0627\u0644\u0642\u0627\u0626\u0645\u0629"),
            },
          ],
        },
      ],
    },
  ];
}

async function pickProductVariantFromList(
  session: ConversationSession,
  value: string,
  productId: string,
) {
  const language = session.language ?? "en";
  const normalized = normalize(value);
  const variants = await availableProductVariants(session.businessId, productId);

  for (const variant of variants) {
    const label = await variantChoiceLabel(variant, language);
    const values = [
      variant.id,
      variant.sku,
      label,
      `${label} - ${formatPrice(variant.price)}`,
    ].map(normalize);
    if (values.includes(normalized)) return variant;
  }

  return undefined;
}

async function availableProductVariants(businessId: string, productId: string) {
  const variants = await listProductVariants(businessId, productId);
  return variants.filter((variant) => variant.isAvailable && variant.stockQuantity > 0);
}

async function variantChoiceLabel(
  variant: StoreProductVariant,
  language: ConversationLanguage,
) {
  const values = await Promise.all(
    variant.selectedOptionValueIds.map(async (valueId) => {
      const value = await findProductOptionValue(valueId);
      return value ? getOptionValueName(value, language) : valueId;
    }),
  );
  return values.filter(Boolean).join(" / ") || variant.sku;
}

function customFieldQuestionResponse(
  session: ConversationSession,
  field: StoreProductCustomField | undefined,
): BotResponse {
  const language = session.language ?? "en";
  if (!field) return mainMenuResponse(language);

  if (field.type === "yes_no") {
    return {
      type: "buttons",
      body: customFieldPromptText(field, language),
      buttons: [
        { id: "yes", title: t(language, "Yes", "\u0646\u0639\u0645") },
        { id: "no", title: t(language, "No", "\u0644\u0627") },
        field.isRequired
          ? { id: "back", title: t(language, "Back", "\u0631\u062c\u0648\u0639") }
          : { id: "skip", title: t(language, "Skip", "\u062a\u062e\u0637\u064a") },
      ],
    };
  }

  if (field.type === "single_choice" && field.choices?.length) {
    const rows = [
      ...field.choices.map((choice) => ({
        id: choice.id,
        title: truncateListTitle(language === "ar" ? choice.labelArabic : choice.labelEnglish),
      })),
      ...(!field.isRequired
        ? [{ id: "skip", title: t(language, "Skip", "\u062a\u062e\u0637\u064a") }]
        : []),
      { id: "back", title: t(language, "Back", "\u0631\u062c\u0648\u0639") },
      {
        id: "main_menu",
        title: t(language, "Main menu", "\u0627\u0644\u0642\u0627\u0626\u0645\u0629"),
      },
    ];

    return {
      type: "list",
      body: customFieldPromptText(field, language),
      buttonText: t(language, "Choose", "\u0627\u062e\u062a\u0631"),
      sections: [
        {
          title: truncateListTitle(getCustomFieldLabel(field, language)),
          rows,
        },
      ],
    };
  }

  return {
    type: "text",
    text: customFieldPromptText(field, language),
  };
}

function customFieldPromptText(field: StoreProductCustomField, language: ConversationLanguage) {
  const placeholder = getCustomFieldPlaceholder(field, language);
  const skipHint = field.isRequired
    ? undefined
    : t(
        language,
        "Type skip to leave empty.",
        "\u0627\u0643\u062a\u0628 \u062a\u062e\u0637\u064a \u0644\u0644\u062a\u0631\u0643 \u0641\u0627\u0631\u063a\u0627.",
      );
  return [getCustomFieldLabel(field, language), placeholder, skipHint]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function automaticCustomFieldAnswer(
  field: StoreProductCustomField,
  language: ConversationLanguage,
) {
  if (field.type !== "single_choice" || !field.isRequired || field.choices?.length !== 1) {
    return undefined;
  }
  const [choice] = field.choices;
  return language === "ar" ? choice.labelArabic : choice.labelEnglish;
}

async function quantityQuestionResponse(
  session: ConversationSession,
  cartItemId?: string,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const pendingItem = getPendingItemFromContext(session.context);
  const item = cartItemId
    ? getCartFromContext(session.context).find((entry) => entry.id === cartItemId)
    : undefined;
  const stockLimit = pendingItem
    ? await getStockLimit({
        businessId: session.businessId,
        productId: pendingItem.productId,
        variantId: pendingItem.resolvedVariantId,
      })
    : item
      ? await getStockLimit({
          businessId: session.businessId,
          productId: item.productId,
          variantId: item.variantId,
        })
      : MAX_QUANTITY_PER_ITEM;
  const max = Math.min(stockLimit, MAX_QUANTITY_PER_ITEM);
  const buttons = [1, 2, 3]
    .filter((quantity) => quantity <= max)
    .map((quantity) => ({ id: String(quantity), title: String(quantity) }));
  const body = t(
    language,
    `Choose quantity. Available: ${stockLimit}`,
    `اختر الكمية. المتوفر: ${stockLimit}`,
  );

  return buttons.length ? [{ type: "buttons", body, buttons }] : [{ type: "text", text: body }];
}

function unavailableCombinationResponse(language: ConversationLanguage): BotResponse {
  return {
    type: "buttons",
    body: t(
      language,
      "That combination is currently unavailable.",
      "هذه المجموعة غير متوفرة حاليا.",
    ),
    buttons: [
      { id: "product_order", title: t(language, "Choose options", "اختر خيارات") },
      { id: "product_back", title: t(language, "Back to product", "رجوع") },
      { id: "main_menu", title: t(language, "Main menu", "القائمة") },
    ],
  };
}

function addedToCartResponse(item: CartItem, language: ConversationLanguage): BotResponse {
  return {
    type: "text",
    text: `${t(language, "Added to cart", "تمت الإضافة إلى السلة")}\n\n${cartItemSummary(item, language)}`,
  };
}

async function cartMenuResponse(session: ConversationSession): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const cart = calculateCart(getCartFromContext(session.context));

  if (!cart.items.length) {
    return [
      {
        type: "buttons",
        body: t(language, "Your cart is empty.", "سلتك فارغة."),
        buttons: [
          { id: "cart_add_another", title: t(language, "Add item", "أضف منتج") },
          { id: "main_menu", title: t(language, "Main menu", "القائمة") },
        ],
      },
    ];
  }

  return [
    {
      type: "text",
      text: `${cart.items.map((item, index) => `${index + 1}. ${cartItemSummary(item, language)}`).join("\n\n")}\n\n${t(
        language,
        "Subtotal",
        "المجموع",
      )}: ${formatPrice(cart.subtotal)}`,
    },
    {
      type: "list",
      body: t(language, "What would you like to do?", "ماذا تريد أن تفعل؟"),
      buttonText: t(language, "Cart", "السلة"),
      sections: [
        {
          title: t(language, "Cart actions", "إجراءات السلة"),
          rows: [
            { id: "cart_add_another", title: t(language, "Add another item", "أضف منتجا آخر") },
            { id: "cart_edit", title: t(language, "Change quantity", "تغيير الكمية") },
            { id: "cart_remove", title: t(language, "Remove item", "حذف منتج") },
            { id: "cart_clear", title: t(language, "Clear cart", "تفريغ السلة") },
            { id: "cart_checkout", title: t(language, "Checkout", "الدفع") },
          ],
        },
      ],
    },
  ];
}

function customerNameQuestion(
  session: ConversationSession,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "text",
    text:
      language === "ar"
        ? flowSettings.customerNamePromptArabic
        : flowSettings.customerNamePromptEnglish,
  };
}

function savedCustomerDetailsQuestion(
  session: ConversationSession,
  settings: BusinessCheckoutSettings,
  profile: WhatsAppCustomerProfile,
): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "buttons",
    body: buildSavedCustomerDetailsText(language, settings, profile),
    buttons: [
      {
        id: "saved_details_use",
        title: t(language, "Use saved", "\u0627\u0633\u062a\u062e\u062f\u0645\u0647\u0627"),
      },
      {
        id: "saved_details_change",
        title: t(language, "Change", "\u062a\u063a\u064a\u064a\u0631"),
      },
    ],
  };
}

function fulfillmentMethodQuestion(
  session: ConversationSession,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "buttons",
    body:
      language === "ar"
        ? flowSettings.fulfillmentPromptArabic
        : flowSettings.fulfillmentPromptEnglish,
    buttons: [
      { id: "checkout_delivery", title: t(language, "Delivery", "\u062a\u0648\u0635\u064a\u0644") },
      {
        id: "checkout_pickup",
        title: t(language, "Pickup", "\u0627\u0633\u062a\u0644\u0627\u0645"),
      },
    ],
  };
}

function getAvailableFulfillmentMethods(settings: BusinessCheckoutSettings): FulfillmentMethod[] {
  return [
    settings.allowDelivery ? "delivery" : undefined,
    settings.allowPickup ? "pickup" : undefined,
  ].filter((method): method is FulfillmentMethod => Boolean(method));
}

function getSingleFulfillmentMethod(settings: BusinessCheckoutSettings) {
  const methods = getAvailableFulfillmentMethods(settings);
  return methods.length === 1 ? methods[0] : undefined;
}

function getAvailablePaymentMethods(
  settings: BusinessCheckoutSettings,
  fulfillmentMethod?: FulfillmentMethod,
) {
  return settings.paymentMethods.filter((method) =>
    fulfillmentMethod ? method.fulfillmentMethods.includes(fulfillmentMethod) : false,
  );
}

function buildSavedCustomerDetailsText(
  language: ConversationLanguage,
  settings: BusinessCheckoutSettings,
  profile: WhatsAppCustomerProfile,
) {
  const deliveryArea = settings.deliveryAreas.find((area) => area.id === profile.deliveryAreaId);
  const pickupLocation = settings.pickupLocations.find(
    (location) => location.id === profile.pickupLocationId,
  );
  const paymentMethod = settings.paymentMethods.find(
    (method) => method.id === profile.paymentMethod,
  );

  return [
    t(
      language,
      "Use your saved checkout details?",
      "\u0647\u0644 \u062a\u0631\u064a\u062f \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062f\u0641\u0639 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629\u061f",
    ),
    "",
    `${t(language, "Name", "\u0627\u0644\u0627\u0633\u0645")}: ${profile.customerName}`,
    `${t(language, "Fulfillment", "\u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645")}: ${
      profile.fulfillmentMethod === "pickup"
        ? t(language, "Pickup", "\u0627\u0633\u062a\u0644\u0627\u0645")
        : t(language, "Delivery", "\u062a\u0648\u0635\u064a\u0644")
    }`,
    profile.fulfillmentMethod === "delivery" && deliveryArea
      ? `${t(language, "Area", "\u0627\u0644\u0645\u0646\u0637\u0642\u0629")}: ${getDeliveryAreaName(deliveryArea, language)}`
      : undefined,
    profile.fulfillmentMethod === "delivery"
      ? `${t(language, "Address", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646")}: ${profile.deliveryAddress ?? ""}`
      : undefined,
    profile.deliveryLatitude != null && profile.deliveryLongitude != null
      ? `${t(language, "Location", "\u0627\u0644\u0645\u0648\u0642\u0639")}: ${profile.deliveryLatitude}, ${profile.deliveryLongitude}`
      : undefined,
    profile.fulfillmentMethod === "pickup" && pickupLocation
      ? `${t(language, "Pickup location", "\u0645\u0643\u0627\u0646 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645")}: ${getPickupLocationName(
          pickupLocation,
          language,
        )}`
      : undefined,
    paymentMethod
      ? `${t(language, "Payment", "\u0627\u0644\u062f\u0641\u0639")}: ${getPaymentMethodLabel(paymentMethod, language)}`
      : undefined,
    profile.notes
      ? `${t(language, "Notes", "\u0645\u0644\u0627\u062d\u0638\u0627\u062a")}: ${profile.notes}`
      : undefined,
    "",
    t(
      language,
      "You can use these or change them for this order.",
      "\u064a\u0645\u0643\u0646\u0643 \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0647\u0627 \u0623\u0648 \u062a\u063a\u064a\u064a\u0631\u0647\u0627 \u0644\u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628.",
    ),
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function deliveryAreaQuestion(
  session: ConversationSession,
  settings: BusinessCheckoutSettings,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "list",
    body:
      language === "ar"
        ? flowSettings.deliveryAreaPromptArabic
        : flowSettings.deliveryAreaPromptEnglish,
    buttonText: t(language, "Areas", "\u0627\u0644\u0645\u0646\u0627\u0637\u0642"),
    sections: [
      {
        title: t(
          language,
          "Delivery areas",
          "\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u062a\u0648\u0635\u064a\u0644",
        ),
        rows: settings.deliveryAreas.map((area) => ({
          id: area.id,
          title: getDeliveryAreaName(area, language),
          description: `${t(language, "Delivery fee", "\u0631\u0633\u0645 \u0627\u0644\u062a\u0648\u0635\u064a\u0644")}: ${formatPrice(area.deliveryFee)}`,
        })),
      },
    ],
  };
}

function pickupLocationQuestion(
  session: ConversationSession,
  settings: BusinessCheckoutSettings,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "list",
    body:
      language === "ar"
        ? flowSettings.pickupLocationPromptArabic
        : flowSettings.pickupLocationPromptEnglish,
    buttonText: t(language, "Pickup", "\u0627\u0633\u062a\u0644\u0627\u0645"),
    sections: [
      {
        title: t(
          language,
          "Pickup locations",
          "\u0623\u0645\u0627\u0643\u0646 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645",
        ),
        rows: settings.pickupLocations.map((location) => ({
          id: location.id,
          title: getPickupLocationName(location, language),
          description: getPickupLocationAddress(location, language),
        })),
      },
    ],
  };
}

function deliveryAddressQuestion(
  session: ConversationSession,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "text",
    text:
      language === "ar"
        ? flowSettings.deliveryAddressPromptArabic
        : flowSettings.deliveryAddressPromptEnglish,
  };
}

function paymentMethodQuestion(
  session: ConversationSession,
  settings: BusinessCheckoutSettings,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): BotResponse {
  const language = session.language ?? "en";
  const checkout = getCheckoutFromContext(session.context);
  const paymentMethods = settings.paymentMethods.filter(
    (method) =>
      checkout.fulfillmentMethod && method.fulfillmentMethods.includes(checkout.fulfillmentMethod),
  );

  return {
    type: "list",
    body:
      language === "ar"
        ? flowSettings.paymentMethodPromptArabic
        : flowSettings.paymentMethodPromptEnglish,
    buttonText: t(language, "Payment", "\u0627\u0644\u062f\u0641\u0639"),
    sections: [
      {
        title: t(language, "Payment methods", "\u0637\u0631\u0642 \u0627\u0644\u062f\u0641\u0639"),
        rows: paymentMethods.map((method) => ({
          id: method.id,
          title: getPaymentMethodLabel(method, language),
        })),
      },
    ],
  };
}

function orderNotesQuestion(
  session: ConversationSession,
  flowSettings = getDefaultBotFlowSettings(session.businessId),
): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "buttons",
    body:
      language === "ar"
        ? flowSettings.orderNotesPromptArabic
        : flowSettings.orderNotesPromptEnglish,
    buttons: [
      {
        id: "no_notes",
        title: truncateButtonTitle(
          language === "ar" ? flowSettings.noNotesButtonArabic : flowSettings.noNotesButtonEnglish,
        ),
      },
    ],
  };
}

async function reviewOrderResponse(session: ConversationSession): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const settings = await getBusinessCheckoutSettings(session.businessId);
  const validation = await validateCartForOrder({
    businessId: session.businessId,
    cart: getCartFromContext(session.context),
  });

  if (!settings || !validation.ok) {
    return [
      stockChangedResponse(language, validation.ok ? undefined : validation.itemName),
      ...(await cartMenuResponse(session)),
    ];
  }

  return [
    { type: "text", text: buildOrderReviewText(session, settings, validation.cart) },
    {
      type: "buttons",
      body: t(
        language,
        "Confirm this order?",
        "\u0647\u0644 \u062a\u0624\u0643\u062f \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628\u061f",
      ),
      buttons: [
        {
          id: "confirm_order",
          title: t(language, "Confirm order", "\u062a\u0623\u0643\u064a\u062f"),
        },
        { id: "edit_cart", title: t(language, "Edit cart", "\u062a\u0639\u062f\u064a\u0644") },
        { id: "cancel_checkout", title: t(language, "Cancel", "\u0625\u0644\u063a\u0627\u0621") },
      ],
    },
  ];
}

function editCartItemResponse(session: ConversationSession): BotResponse[] {
  const language = session.language ?? "en";
  const cart = getCartFromContext(session.context);
  return [
    {
      type: "list",
      body: t(language, "Choose an item to change quantity:", "اختر منتجا لتغيير كميته:"),
      buttonText: t(language, "Items", "المنتجات"),
      sections: [
        {
          title: t(language, "Cart items", "منتجات السلة"),
          rows: cart.map((item, index) => ({
            id: `edit_cart_item:${item.id}`,
            title: truncateListTitle(`${index + 1}. ${item.productName}`),
            description: `${item.quantity} x ${formatPrice(item.unitPrice)}`,
          })),
        },
      ],
    },
  ];
}

function removeCartItemResponse(session: ConversationSession): BotResponse[] {
  const language = session.language ?? "en";
  const cart = getCartFromContext(session.context);
  return [
    {
      type: "list",
      body: t(language, "Choose an item to remove:", "اختر منتجا لحذفه:"),
      buttonText: t(language, "Items", "المنتجات"),
      sections: [
        {
          title: t(language, "Cart items", "منتجات السلة"),
          rows: cart.map((item, index) => ({
            id: `remove_cart_item:${item.id}`,
            title: truncateListTitle(`${index + 1}. ${item.productName}`),
            description: `${item.quantity} x ${formatPrice(item.unitPrice)}`,
          })),
        },
      ],
    },
  ];
}

function cartItemSummary(item: CartItem, language: ConversationLanguage) {
  const details = [
    item.productName,
    `${t(language, "Code", "الرمز")}: ${item.productCode}`,
    ...item.selectedOptions.map((option) => `${option.label}: ${option.value}`),
    ...item.customFieldAnswers.map((answer) => `${answer.label}: ${answer.value}`),
    `${t(language, "Quantity", "الكمية")}: ${item.quantity}`,
    `${t(language, "Total", "المجموع")}: ${formatPrice(item.lineTotal)}`,
  ];
  return details.join("\n");
}

function buildOrderReviewText(
  session: ConversationSession,
  settings: BusinessCheckoutSettings,
  cart: CartItem[],
) {
  const language = session.language ?? "en";
  const checkout = getCheckoutFromContext(session.context);
  const subtotal = calculateCart(cart).subtotal;
  const deliveryArea = settings.deliveryAreas.find((area) => area.id === checkout.deliveryAreaId);
  const pickupLocation = settings.pickupLocations.find(
    (location) => location.id === checkout.pickupLocationId,
  );
  const paymentMethod = settings.paymentMethods.find(
    (method) => method.id === checkout.paymentMethod,
  );
  const deliveryFee =
    checkout.fulfillmentMethod === "delivery" ? (deliveryArea?.deliveryFee ?? 0) : 0;
  const total = subtotal + deliveryFee;

  return [
    t(
      language,
      "Order review",
      "\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0637\u0644\u0628",
    ),
    "",
    ...cart.map((item, index) => `${index + 1}. ${cartItemSummary(item, language)}`),
    "",
    `${t(language, "Subtotal", "\u0627\u0644\u0645\u062c\u0645\u0648\u0639")}: ${formatPrice(subtotal)}`,
    `${t(language, "Delivery fee", "\u0631\u0633\u0645 \u0627\u0644\u062a\u0648\u0635\u064a\u0644")}: ${formatPrice(deliveryFee)}`,
    `${t(language, "Final total", "\u0627\u0644\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0646\u0647\u0627\u0626\u064a")}: ${formatPrice(total)}`,
    "",
    `${t(language, "Customer", "\u0627\u0644\u0639\u0645\u064a\u0644")}: ${checkout.customerName ?? ""}`,
    `${t(language, "WhatsApp", "\u0648\u0627\u062a\u0633\u0627\u0628")}: ${session.customerPhone}`,
    checkout.alternatePhone
      ? `${t(language, "Alternate phone", "\u0647\u0627\u062a\u0641 \u0628\u062f\u064a\u0644")}: ${checkout.alternatePhone}`
      : undefined,
    `${t(language, "Fulfillment", "\u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645")}: ${
      checkout.fulfillmentMethod === "pickup"
        ? t(language, "Pickup", "\u0627\u0633\u062a\u0644\u0627\u0645")
        : t(language, "Delivery", "\u062a\u0648\u0635\u064a\u0644")
    }`,
    checkout.fulfillmentMethod === "delivery" && deliveryArea
      ? `${t(language, "Area", "\u0627\u0644\u0645\u0646\u0637\u0642\u0629")}: ${getDeliveryAreaName(deliveryArea, language)}`
      : undefined,
    checkout.fulfillmentMethod === "delivery"
      ? `${t(language, "Address", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646")}: ${checkout.deliveryAddress ?? ""}`
      : undefined,
    checkout.deliveryLatitude != null && checkout.deliveryLongitude != null
      ? `${t(language, "Location", "\u0627\u0644\u0645\u0648\u0642\u0639")}: ${checkout.deliveryLatitude}, ${checkout.deliveryLongitude}`
      : undefined,
    checkout.fulfillmentMethod === "pickup" && pickupLocation
      ? `${t(language, "Pickup location", "\u0645\u0643\u0627\u0646 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645")}: ${getPickupLocationName(
          pickupLocation,
          language,
        )}`
      : undefined,
    paymentMethod
      ? `${t(language, "Payment", "\u0627\u0644\u062f\u0641\u0639")}: ${getPaymentMethodLabel(paymentMethod, language)}`
      : undefined,
    `${t(language, "Notes", "\u0645\u0644\u0627\u062d\u0638\u0627\u062a")}: ${
      checkout.notes || t(language, "None", "\u0644\u0627 \u064a\u0648\u062c\u062f")
    }`,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function orderCreatedResponse(
  order: WhatsAppOrder,
  settings: BusinessCheckoutSettings,
  session: ConversationSession,
): BotResponse {
  const language = session.language ?? "en";
  const confirmationMessage =
    language === "ar"
      ? settings.orderConfirmationMessageArabic
      : settings.orderConfirmationMessageEnglish;

  return {
    type: "text",
    text: [
      t(
        language,
        "Order received.",
        "\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0637\u0644\u0628.",
      ),
      "",
      `${t(language, "Order", "\u0627\u0644\u0637\u0644\u0628")}: ${order.orderNumber}`,
      `${t(language, "Total", "\u0627\u0644\u0645\u062c\u0645\u0648\u0639")}: ${formatPrice(order.total)}`,
      "",
      confirmationMessage,
    ].join("\n"),
  };
}

function stockChangedResponse(language: ConversationLanguage, itemName?: string): BotResponse {
  return {
    type: "text",
    text: itemName
      ? t(
          language,
          `${itemName} is no longer available in the requested quantity. Please update your cart.`,
          `${itemName} \u0644\u0645 \u064a\u0639\u062f \u0645\u062a\u0648\u0641\u0631\u0627 \u0628\u0627\u0644\u0643\u0645\u064a\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629. \u064a\u0631\u062c\u0649 \u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0633\u0644\u0629.`,
        )
      : t(
          language,
          "Some cart items changed before checkout. Please review your cart.",
          "\u062a\u063a\u064a\u0631\u062a \u0628\u0639\u0636 \u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0633\u0644\u0629 \u0642\u0628\u0644 \u0627\u0644\u062f\u0641\u0639. \u064a\u0631\u062c\u0649 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0633\u0644\u0629.",
        ),
  };
}

function getCheckoutFromContext(context: Record<string, unknown>): CheckoutDraft {
  if (!context.checkout || typeof context.checkout !== "object") return {};
  return context.checkout as CheckoutDraft;
}

function getSavedCheckoutFromContext(context: Record<string, unknown>): CheckoutDraft | undefined {
  if (!context.savedCheckout || typeof context.savedCheckout !== "object") return undefined;
  return context.savedCheckout as CheckoutDraft;
}

async function labelsForSelectedOptions(
  options: StoreProductOption[],
  pendingItem: PendingItem,
  language: ConversationLanguage,
) {
  const optionValueGroups = await Promise.all(
    options.map(async (option) => ({
      option,
      values: await listProductOptionValues(option.id),
    })),
  );

  return Promise.all(
    pendingItem.selectedOptionValueIds.map(async (optionValueId) => {
      const match = optionValueGroups.find((entry) =>
        entry.values.some((value) => value.id === optionValueId),
      );
      return {
        optionValueId,
        label: match ? getOptionName(match.option, language) : optionValueId,
      };
    }),
  );
}

function validateCustomField(
  field: StoreProductCustomField,
  rawValue: string,
  language: ConversationLanguage,
):
  | { ok: true; value?: string }
  | {
      ok: false;
      error: string;
    } {
  const value = rawValue.trim();
  const normalized = normalize(value);
  const skipValues = ["skip", "none", "\u062a\u062e\u0637\u064a"];
  if (field.isRequired && !value) {
    return {
      ok: false,
      error: t(
        language,
        "This field is required.",
        "\u0647\u0630\u0627 \u0627\u0644\u062d\u0642\u0644 \u0645\u0637\u0644\u0648\u0628.",
      ),
    };
  }
  if (!field.isRequired && !value) return { ok: true };
  if (field.type !== "yes_no" && !field.isRequired && skipValues.includes(normalized)) {
    return { ok: true };
  }

  if (
    (field.type === "short_text" || field.type === "long_text") &&
    field.minimumLength &&
    value.length < field.minimumLength
  ) {
    return {
      ok: false,
      error: t(
        language,
        `Minimum ${field.minimumLength} characters.`,
        `\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 ${field.minimumLength} \u0623\u062d\u0631\u0641.`,
      ),
    };
  }
  if (
    (field.type === "short_text" || field.type === "long_text") &&
    field.maximumLength &&
    value.length > field.maximumLength
  ) {
    return {
      ok: false,
      error: t(
        language,
        `Maximum ${field.maximumLength} characters.`,
        `\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 ${field.maximumLength} \u0623\u062d\u0631\u0641.`,
      ),
    };
  }
  if (field.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return {
        ok: false,
        error: t(
          language,
          "Enter a valid number.",
          "\u0623\u062f\u062e\u0644 \u0631\u0642\u0645\u0627 \u0635\u062d\u064a\u062d\u0627.",
        ),
      };
    }
    if (field.minimumValue != null && number < field.minimumValue) {
      return {
        ok: false,
        error: t(
          language,
          `Minimum value is ${field.minimumValue}.`,
          `\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 ${field.minimumValue}.`,
        ),
      };
    }
    if (field.maximumValue != null && number > field.maximumValue) {
      return {
        ok: false,
        error: t(
          language,
          `Maximum value is ${field.maximumValue}.`,
          `\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 ${field.maximumValue}.`,
        ),
      };
    }
  }
  if (field.type === "yes_no") {
    if (["yes", "y", "true", "1", "\u0646\u0639\u0645"].includes(normalized))
      return { ok: true, value: t(language, "Yes", "\u0646\u0639\u0645") };
    if (["no", "n", "false", "0", "\u0644\u0627"].includes(normalized))
      return { ok: true, value: t(language, "No", "\u0644\u0627") };
    if (!field.isRequired && skipValues.includes(normalized)) return { ok: true };
    return {
      ok: false,
      error: t(
        language,
        "Choose yes or no.",
        "\u0627\u062e\u062a\u0631 \u0646\u0639\u0645 \u0623\u0648 \u0644\u0627.",
      ),
    };
  }
  if (field.type === "single_choice" && field.choices?.length) {
    const choice = field.choices.find(
      (entry) =>
        entry.id === value ||
        normalize(entry.labelEnglish) === normalized ||
        normalize(entry.labelArabic) === normalized,
    );
    if (!choice)
      return {
        ok: false,
        error: t(
          language,
          "Choose one of the listed options.",
          "\u0627\u062e\u062a\u0631 \u0623\u062d\u062f \u0627\u0644\u062e\u064a\u0627\u0631\u0627\u062a.",
        ),
      };
    return { ok: true, value: language === "ar" ? choice.labelArabic : choice.labelEnglish };
  }

  return { ok: true, value };
}

function validateQuantity(quantity: number, stockLimit: number, language: ConversationLanguage) {
  if (!Number.isInteger(quantity)) return t(language, "Enter a whole number.", "أدخل رقما صحيحا.");
  if (quantity < 1)
    return t(language, "Quantity must be at least 1.", "يجب أن تكون الكمية 1 على الأقل.");
  if (quantity > MAX_QUANTITY_PER_ITEM) {
    return t(
      language,
      `Maximum per item is ${MAX_QUANTITY_PER_ITEM}.`,
      `الحد الأقصى ${MAX_QUANTITY_PER_ITEM}.`,
    );
  }
  if (quantity > stockLimit) {
    return t(language, `Only ${stockLimit} available.`, `المتوفر فقط ${stockLimit}.`);
  }
  return undefined;
}

function parseLanguage(value: string): ConversationLanguage | undefined {
  const normalized = normalize(value);
  if (["1", "english", "en", "language_en"].includes(normalized)) return "en";
  if (["2", "arabic", "ar", "العربية", "عربي", "language_ar"].includes(normalized)) return "ar";
  return undefined;
}

function parseMainMenuOption(value: string, flowSettings?: BusinessBotFlowSettings) {
  const normalized = normalize(value);
  const orderValues = [
    "1",
    "main_order",
    "place an order",
    "\u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628",
  ];
  const questionValues = [
    "2",
    "main_question",
    "ask a question",
    "\u0637\u0631\u062d \u0633\u0624\u0627\u0644",
  ];
  const infoValues = [
    "3",
    "main_info",
    "store information",
    "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631",
  ];

  if (flowSettings) {
    const customOption = flowSettings.mainMenuOptions
      ?.filter((option) => option.active)
      .find((option) => {
        const values = [option.key, `main_${option.key}`, option.label.en, option.label.ar].map(
          normalize,
        );
        return values.includes(normalized);
      });
    if (customOption) {
      if (customOption.targetNodeId === "category_select" || customOption.key === "order") {
        return "order";
      }
      if (customOption.key === "question") return "question";
      if (customOption.key === "info") return "info";
      return customOption.key;
    }
    orderValues.push(flowSettings.orderButtonEnglish, flowSettings.orderButtonArabic);
    questionValues.push(flowSettings.questionButtonEnglish, flowSettings.questionButtonArabic);
    infoValues.push(flowSettings.infoButtonEnglish, flowSettings.infoButtonArabic);
  }

  if (orderValues.map(normalize).includes(normalized)) return "order";
  if (questionValues.map(normalize).includes(normalized)) return "question";
  if (infoValues.map(normalize).includes(normalized)) return "info";
  return undefined;
}

function parseNavigation(value: string) {
  const normalized = normalize(value);
  if (["back", "previous", "prev", "رجوع", "السابق"].includes(normalized)) return "back";
  if (["next", "next_page", "التالي"].includes(normalized)) return "next";
  if (["previous_page"].includes(normalized)) return "previous";
  return undefined;
}

function parseProductDetailsAction(value: string) {
  const normalized = normalize(value);
  if (["product_order", "order this item", "اطلب المنتج", "اطلب هذا المنتج"].includes(normalized))
    return "order_item";
  if (["product_back", "back to products", "رجوع"].includes(normalized)) return "back_to_products";
  return undefined;
}

function getGlobalCommand(value: string): "restart" | "menu" | "cart" | "cancel" | undefined {
  const normalized = normalize(value);
  if (["restart", "start", "إعادة"].includes(normalized)) return "restart";
  if (["menu", "main_menu", "القائمة"].includes(normalized)) return "menu";
  if (["cart", "view cart", "السلة"].includes(normalized)) return "cart";
  if (["cancel", "إلغاء"].includes(normalized)) return "cancel";
  return undefined;
}

function pickCategory(categories: StoreCategory[], value: string, language: ConversationLanguage) {
  const normalized = normalize(value);
  return categories.find(
    (category) =>
      category.id === value ||
      normalize(getCategoryName(category, language)) === normalized ||
      normalize(category.nameEnglish) === normalized ||
      normalize(category.nameArabic) === normalized,
  );
}

function pickCatalogGroup(
  groups: StoreCatalogGroup[],
  value: string,
  language: ConversationLanguage,
) {
  const normalized = normalize(value);
  return groups.find(
    (group) =>
      group.id === value ||
      normalize(group.slug) === normalized ||
      normalize(getCatalogGroupName(group, language)) === normalized ||
      normalize(group.nameEnglish) === normalized ||
      normalize(group.nameArabic) === normalized,
  );
}

function pickCatalogGroupValue(
  values: StoreCatalogGroupValue[],
  value: string,
  language: ConversationLanguage,
) {
  const normalized = normalize(value);
  return values.find(
    (groupValue) =>
      groupValue.id === value ||
      normalize(groupValue.slug) === normalized ||
      normalize(getCatalogGroupValueName(groupValue, language)) === normalized ||
      normalize(groupValue.nameEnglish) === normalized ||
      normalize(groupValue.nameArabic) === normalized,
  );
}

function pickProduct(products: StoreProduct[], value: string, language: ConversationLanguage) {
  const normalized = normalize(value);
  return products.find(
    (product) =>
      product.id === value ||
      normalize(product.code) === normalized ||
      normalize(getProductName(product, language)) === normalized ||
      normalize(product.nameEnglish) === normalized ||
      normalize(product.nameArabic) === normalized,
  );
}

function getNavigationRows(
  page: number,
  totalCount: number,
  language: ConversationLanguage,
  includeBack = false,
) {
  const rows: Array<{ id: string; title: string; description?: string }> = [];
  const hasPreviousPage = page > 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < totalCount;
  if (hasPreviousPage)
    rows.push({ id: "previous_page", title: t(language, "Previous page", "السابق") });
  if (hasNextPage) rows.push({ id: "next_page", title: t(language, "Next page", "التالي") });
  if (includeBack) rows.push({ id: "back", title: t(language, "Back", "رجوع") });
  rows.push({ id: "main_menu", title: t(language, "Main menu", "القائمة") });
  return rows;
}

function getValidPage(page: number, totalCount: number) {
  const maxPage = Math.max(0, Math.ceil(totalCount / PAGE_SIZE) - 1);
  return Math.min(Math.max(0, page), maxPage);
}

function getPageNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getContextString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getAvailabilityLabel(product: StoreProduct, language: ConversationLanguage) {
  if (product.isAvailable) return t(language, "Available", "متوفر");
  return t(language, "Unavailable", "غير متوفر");
}

function formatPrice(price: number) {
  return `$${price.toFixed(2)}`;
}

function truncateListTitle(value: string) {
  return value.length <= 24 ? value : `${value.slice(0, 21)}...`;
}

function truncateButtonTitle(value: string) {
  return value.length <= 20 ? value : `${value.slice(0, 17)}...`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function t(language: ConversationLanguage, english: string, arabic: string) {
  return language === "ar" ? arabic : english;
}
