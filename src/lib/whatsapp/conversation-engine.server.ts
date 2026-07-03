import "@tanstack/react-start/server-only";
import {
  DOUBLE_A_TEST_BUSINESS_ID,
  findActiveCategoryById,
  findVisibleProductByCode,
  findVisibleProductById,
  getCategoryName,
  getCustomFieldLabel,
  getCustomFieldPlaceholder,
  getOptionName,
  getOptionValueName,
  getProductDescription,
  getProductName,
  listActiveCategories,
  listProductCustomFields,
  listProductOptions,
  listProductOptionValues,
  listVisibleProductsByCategory,
  resolveProductVariant,
  type StoreCategory,
  type StoreProduct,
  type StoreProductCustomField,
  type StoreProductOption,
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
} from "./conversation-store.server";
import {
  createPendingOrder,
  validateCartForOrder,
  type CheckoutDraft,
  type WhatsAppOrder,
} from "./order-store.server";

export { DOUBLE_A_TEST_BUSINESS_ID };

export type ConversationInput = {
  type: "text" | "button" | "list" | "location" | "unknown";
  value: string;
  latitude?: number;
  longitude?: number;
};

export type BotResponse =
  | { type: "text"; text: string }
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
  const flowSettings = await getBusinessBotFlowSettings(businessId);
  let session = await getActiveConversationSession({ businessId, customerPhone, now });

  if (!session) {
    session = await createConversationSession({ businessId, customerPhone, now });
    if (!flowSettings.languageSelectionEnabled) {
      session = await saveConversationSession(
        {
          ...session,
          language: flowSettings.defaultLanguage,
          currentStep: "MAIN_MENU",
        },
        now,
      );
      return handleMainMenu(session, input, now, flowSettings);
    }
  }

  const command = getGlobalCommand(input.value);

  if (command === "restart") {
    await deleteConversationSession({ businessId, customerPhone });
    session = await createConversationSession({ businessId, customerPhone, now });
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
    return [languageSelectionResponse()];
  }

  if (command === "menu") {
    if (!session.language && flowSettings.languageSelectionEnabled)
      return [languageSelectionResponse()];
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
    if (!session.language) return [languageSelectionResponse()];
    const nextSession = await saveConversationSession(
      { ...session, currentStep: "CART_MENU" },
      now,
    );
    return cartMenuResponse(nextSession);
  }

  if (command === "cancel") {
    if (!session.language) return [languageSelectionResponse()];
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

  if (session.currentStep === "SELECT_LANGUAGE")
    return handleLanguageSelection(session, input, now, flowSettings);
  if (session.currentStep === "SELECT_CATEGORY")
    return handleCategorySelection(session, input, now);
  if (session.currentStep === "SELECT_PRODUCT") return handleProductSelection(session, input, now);
  if (session.currentStep === "PRODUCT_DETAILS") return handleProductDetails(session, input, now);
  if (session.currentStep === "SELECT_PRODUCT_OPTION") {
    return handleProductOptionSelection(session, input, now);
  }
  if (session.currentStep === "COLLECT_CUSTOM_FIELD")
    return handleCustomFieldInput(session, input, now);
  if (session.currentStep === "SELECT_QUANTITY")
    return handleQuantitySelection(session, input, now);
  if (session.currentStep === "CART_MENU") return handleCartMenu(session, input, now);
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
    return handleCompletedOrder(session, input, now);
  }

  return handleMainMenu(session, input, now, flowSettings);
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
    return [languageSelectionResponse()];
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
        currentStep: "SELECT_CATEGORY",
        context: {
          ...session.context,
          categoryPage: 0,
          selectedCategoryId: undefined,
          selectedProductId: undefined,
          createdOrderId: undefined,
          createdOrderNumber: undefined,
        },
      },
      now,
    );
    return categorySelectionResponse(nextSession);
  }

  await saveConversationSession(
    {
      ...session,
      language,
      currentStep: "MAIN_MENU",
      context: option ? { ...session.context, lastMenuSelection: option } : session.context,
    },
    now,
  );
  return [mainMenuResponse(language, flowSettings)];
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
      context: {
        ...session.context,
        selectedCategoryId: selectedCategory.id,
        selectedProductId: undefined,
        productPage: 0,
      },
    },
    now,
  );
  return productSelectionResponse(nextSession);
}

async function handleProductSelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const navigation = parseNavigation(input.value);

  if (navigation === "back") {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "SELECT_CATEGORY",
        context: { ...session.context, categoryPage: 0, selectedProductId: undefined },
      },
      now,
    );
    return categorySelectionResponse(nextSession);
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
  const categoryId = getContextString(session.context.selectedCategoryId);
  const productByCode = await findVisibleProductByCode(session.businessId, input.value);
  const products = categoryId
    ? await listVisibleProductsByCategory(session.businessId, categoryId)
    : [];
  const selectedProduct =
    productByCode && (!categoryId || productByCode.categoryId === categoryId)
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
        context: {
          ...session.context,
          categoryPage: 0,
          createdOrderId: undefined,
          createdOrderNumber: undefined,
        },
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
  const optionIndex = getPageNumber(session.context.optionIndex);
  if (optionIndex < options.length) {
    await saveConversationSession({ ...session, currentStep: "SELECT_PRODUCT_OPTION" }, now);
    return optionQuestionResponse(session, options[optionIndex]);
  }

  const product = await findVisibleProductById(session.businessId, pendingItem.productId);
  if (!product) return [mainMenuResponse(session.language ?? "en")];

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
  if (fieldIndex < fields.length) {
    await saveConversationSession({ ...withVariant, currentStep: "COLLECT_CUSTOM_FIELD" }, now);
    return [customFieldQuestionResponse(withVariant, fields[fieldIndex])];
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

  const options = await listProductOptions(session.businessId, pendingItem.productId);
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
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const normalized = normalize(input.value);

  if (["cart_add_another", "add another item"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "SELECT_CATEGORY",
        context: { ...session.context, categoryPage: 0 },
      },
      now,
    );
    return categorySelectionResponse(nextSession);
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

  return [customerNameQuestion(nextSession)];
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

    return [customerNameQuestion(nextSession)];
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
          singleFulfillmentMethod === "delivery" ? "SELECT_DELIVERY_AREA" : "SELECT_PICKUP_LOCATION",
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
  return [fulfillmentMethodQuestion(nextSession)];
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

  if (!fulfillmentMethod) return [fulfillmentMethodQuestion(session)];

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
      return [deliveryAddressQuestion(nextSession)];
    }

    const nextSession = await saveConversationSession(
      { ...session, currentStep: "SELECT_DELIVERY_AREA" },
      now,
    );
    return [deliveryAreaQuestion(nextSession, settings)];
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
    return [pickupLocationQuestion(nextSession, settings)];
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
  return [paymentMethodQuestion(nextSession, settings)];
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
  return [orderNotesQuestion(nextSession)];
}

async function handleDeliveryArea(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const settings = await getBusinessCheckoutSettings(session.businessId);
  if (!settings) return startCheckout(session, now);

  const area = settings.deliveryAreas.find((entry) => entry.id === input.value);
  if (!area) return [deliveryAreaQuestion(session, settings)];

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

  return [deliveryAddressQuestion(nextSession)];
}

async function handlePickupLocation(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const settings = await getBusinessCheckoutSettings(session.businessId);
  if (!settings) return startCheckout(session, now);

  const pickupLocation = settings.pickupLocations.find((entry) => entry.id === input.value);
  if (!pickupLocation) return [pickupLocationQuestion(session, settings)];

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
      deliveryAddressQuestion(session),
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
  if (!paymentMethod) return [paymentMethodQuestion(session, settings)];

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
): Promise<BotResponse[]> {
  const normalized = normalize(input.value);
  if (["cart_add_another", "new order", "place an order"].includes(normalized)) {
    const nextSession = await saveConversationSession(
      {
        ...session,
        currentStep: "SELECT_CATEGORY",
        context: {
          ...session.context,
          cart: [],
          checkout: undefined,
          pendingItem: undefined,
          categoryPage: 0,
          selectedCategoryId: undefined,
          selectedProductId: undefined,
          createdOrderId: undefined,
          createdOrderNumber: undefined,
        },
      },
      now,
    );
    return categorySelectionResponse(nextSession);
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

function languageSelectionResponse(): BotResponse {
  return {
    type: "buttons",
    body: "Choose your language:",
    buttons: [
      { id: "language_en", title: "English" },
      { id: "language_ar", title: "العربية" },
    ],
  };
}

function mainMenuResponse(
  language: ConversationLanguage,
  flowSettings = getDefaultBotFlowSettings(""),
): BotResponse {
  return {
    type: "buttons",
    body:
      language === "ar"
        ? flowSettings.welcomeMessageArabic
        : flowSettings.welcomeMessageEnglish,
    buttons: [
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
    ],
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

async function productSelectionResponse(session: ConversationSession): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const categoryId = getContextString(session.context.selectedCategoryId);
  const category = categoryId
    ? await findActiveCategoryById(session.businessId, categoryId)
    : undefined;
  const products = categoryId
    ? await listVisibleProductsByCategory(session.businessId, categoryId)
    : [];
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
        `Choose a product from ${category ? getCategoryName(category, language) : ""}:`,
        `اختر منتجا من ${category ? getCategoryName(category, language) : ""}:`,
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
  return [
    {
      type: "list",
      body: t(
        language,
        `Choose ${getOptionName(option, language)}:`,
        `اختر ${getOptionName(option, language)}:`,
      ),
      buttonText: getOptionName(option, language).slice(0, 20),
      sections: [
        {
          title: getOptionName(option, language),
          rows: [
            ...values.map((value) => ({
              id: value.id,
              title: getOptionValueName(value, language),
            })),
            { id: "back", title: t(language, "Back", "رجوع") },
            { id: "main_menu", title: t(language, "Main menu", "القائمة") },
          ],
        },
      ],
    },
  ];
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
      body: getCustomFieldLabel(field, language),
      buttons: [
        { id: "yes", title: t(language, "Yes", "نعم") },
        { id: "no", title: t(language, "No", "لا") },
        { id: "back", title: t(language, "Back", "رجوع") },
      ],
    };
  }

  if (field.type === "single_choice" && field.choices?.length) {
    return {
      type: "list",
      body: getCustomFieldLabel(field, language),
      buttonText: t(language, "Choose", "اختر"),
      sections: [
        {
          title: getCustomFieldLabel(field, language),
          rows: field.choices.map((choice) => ({
            id: choice.id,
            title: language === "ar" ? choice.labelArabic : choice.labelEnglish,
          })),
        },
      ],
    };
  }

  const placeholder = getCustomFieldPlaceholder(field, language);
  return {
    type: "text",
    text: placeholder
      ? `${getCustomFieldLabel(field, language)}\n${placeholder}`
      : getCustomFieldLabel(field, language),
  };
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

function customerNameQuestion(session: ConversationSession): BotResponse {
  return {
    type: "text",
    text: t(
      session.language ?? "en",
      "What name should we put on the order?",
      "\u0645\u0627 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0630\u064a \u0646\u0636\u0639\u0647 \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628\u061f",
    ),
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

function fulfillmentMethodQuestion(session: ConversationSession): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "buttons",
    body: t(
      language,
      "How would you like to receive your order?",
      "\u0643\u064a\u0641 \u062a\u0631\u064a\u062f \u0627\u0633\u062a\u0644\u0627\u0645 \u0637\u0644\u0628\u0643\u061f",
    ),
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
): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "list",
    body: t(
      language,
      "Choose your delivery area:",
      "\u0627\u062e\u062a\u0631 \u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644:",
    ),
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
): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "list",
    body: t(
      language,
      "Choose a pickup location:",
      "\u0627\u062e\u062a\u0631 \u0645\u0643\u0627\u0646 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645:",
    ),
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

function deliveryAddressQuestion(session: ConversationSession): BotResponse {
  return {
    type: "text",
    text: t(
      session.language ?? "en",
      "Send the full delivery address. You can also send a WhatsApp location.",
      "\u0623\u0631\u0633\u0644 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0627\u0644\u0643\u0627\u0645\u0644. \u064a\u0645\u0643\u0646\u0643 \u0623\u064a\u0636\u0627 \u0625\u0631\u0633\u0627\u0644 \u0645\u0648\u0642\u0639 \u0648\u0627\u062a\u0633\u0627\u0628.",
    ),
  };
}

function paymentMethodQuestion(
  session: ConversationSession,
  settings: BusinessCheckoutSettings,
): BotResponse {
  const language = session.language ?? "en";
  const checkout = getCheckoutFromContext(session.context);
  const paymentMethods = settings.paymentMethods.filter(
    (method) =>
      checkout.fulfillmentMethod && method.fulfillmentMethods.includes(checkout.fulfillmentMethod),
  );

  return {
    type: "list",
    body: t(
      language,
      "Choose a payment method:",
      "\u0627\u062e\u062a\u0631 \u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639:",
    ),
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

function orderNotesQuestion(session: ConversationSession): BotResponse {
  const language = session.language ?? "en";
  return {
    type: "buttons",
    body: t(
      language,
      "Would you like to add any notes?",
      "\u0647\u0644 \u062a\u0631\u064a\u062f \u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0627\u062d\u0638\u0627\u062a\u061f",
    ),
    buttons: [
      {
        id: "no_notes",
        title: t(
          language,
          "No notes",
          "\u0628\u062f\u0648\u0646 \u0645\u0644\u0627\u062d\u0638\u0627\u062a",
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
  const skipValues = ["skip", "none", "تخطي", "لا"];
  if (!field.isRequired && skipValues.includes(normalize(value))) return { ok: true };
  if (field.isRequired && !value) {
    return { ok: false, error: t(language, "This field is required.", "هذا الحقل مطلوب.") };
  }
  if (!field.isRequired && !value) return { ok: true };

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
        `الحد الأدنى ${field.minimumLength} أحرف.`,
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
        `الحد الأقصى ${field.maximumLength} حرفا.`,
      ),
    };
  }
  if (field.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number))
      return { ok: false, error: t(language, "Enter a valid number.", "أدخل رقما صحيحا.") };
    if (field.minimumValue != null && number < field.minimumValue) {
      return {
        ok: false,
        error: t(
          language,
          `Minimum value is ${field.minimumValue}.`,
          `الحد الأدنى ${field.minimumValue}.`,
        ),
      };
    }
    if (field.maximumValue != null && number > field.maximumValue) {
      return {
        ok: false,
        error: t(
          language,
          `Maximum value is ${field.maximumValue}.`,
          `الحد الأقصى ${field.maximumValue}.`,
        ),
      };
    }
  }
  if (field.type === "yes_no") {
    const normalized = normalize(value);
    if (["yes", "y", "true", "1", "نعم"].includes(normalized))
      return { ok: true, value: t(language, "Yes", "نعم") };
    if (["no", "n", "false", "0", "لا"].includes(normalized))
      return { ok: true, value: t(language, "No", "لا") };
    return { ok: false, error: t(language, "Choose yes or no.", "اختر نعم أو لا.") };
  }
  if (field.type === "single_choice" && field.choices?.length) {
    const choice = field.choices.find(
      (entry) =>
        entry.id === value ||
        normalize(entry.labelEnglish) === normalize(value) ||
        normalize(entry.labelArabic) === normalize(value),
    );
    if (!choice)
      return {
        ok: false,
        error: t(language, "Choose one of the listed options.", "اختر أحد الخيارات."),
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
  const orderValues = ["1", "main_order", "place an order", "\u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628"];
  const questionValues = ["2", "main_question", "ask a question", "\u0637\u0631\u062d \u0633\u0624\u0627\u0644"];
  const infoValues = ["3", "main_info", "store information", "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631"];

  if (flowSettings) {
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
