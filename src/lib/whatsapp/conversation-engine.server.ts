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
  buildCartItem,
  calculateCart,
  getCartFromContext,
  getPendingItemFromContext,
  getStockLimit,
  type CartItem,
  type PendingItem,
} from "./cart-service.server";
import {
  createConversationSession,
  deleteConversationSession,
  getActiveConversationSession,
  saveConversationSession,
  type ConversationLanguage,
  type ConversationSession,
} from "./conversation-store.server";

export { DOUBLE_A_TEST_BUSINESS_ID };

export type ConversationInput = {
  type: "text" | "button" | "list" | "unknown";
  value: string;
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
  input,
}: {
  businessId: string;
  customerPhone: string;
  messageId: string;
  input: ConversationInput;
}): Promise<BotResponse[]> {
  const now = new Date();
  let session =
    getActiveConversationSession({ businessId, customerPhone, now }) ??
    createConversationSession({ businessId, customerPhone, now });

  const command = getGlobalCommand(input.value);

  if (command === "restart") {
    deleteConversationSession({ businessId, customerPhone });
    session = createConversationSession({ businessId, customerPhone, now });
    return [languageSelectionResponse()];
  }

  if (command === "menu") {
    if (!session.language) return [languageSelectionResponse()];
    saveConversationSession(
      {
        ...session,
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
    return [mainMenuResponse(session.language)];
  }

  if (command === "cart") {
    if (!session.language) return [languageSelectionResponse()];
    const nextSession = saveConversationSession({ ...session, currentStep: "CART_MENU" }, now);
    return cartMenuResponse(nextSession);
  }

  if (command === "cancel") {
    if (!session.language) return [languageSelectionResponse()];
    const nextSession = saveConversationSession(
      {
        ...session,
        currentStep: "CART_MENU",
        context: { ...session.context, pendingItem: undefined },
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
    return handleLanguageSelection(session, input, now);
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

  return handleMainMenu(session, input, now);
}

function handleLanguageSelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): BotResponse[] {
  const language = parseLanguage(input.value);
  if (!language) {
    saveConversationSession(session, now);
    return [languageSelectionResponse()];
  }

  saveConversationSession({ ...session, language, currentStep: "MAIN_MENU" }, now);
  return [mainMenuResponse(language)];
}

async function handleMainMenu(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const option = parseMainMenuOption(input.value);

  if (option === "order") {
    const nextSession = saveConversationSession(
      {
        ...session,
        language,
        currentStep: "SELECT_CATEGORY",
        context: {
          ...session.context,
          categoryPage: 0,
          selectedCategoryId: undefined,
          selectedProductId: undefined,
        },
      },
      now,
    );
    return categorySelectionResponse(nextSession);
  }

  saveConversationSession(
    {
      ...session,
      language,
      currentStep: "MAIN_MENU",
      context: option ? { ...session.context, lastMenuSelection: option } : session.context,
    },
    now,
  );
  return [mainMenuResponse(language)];
}

async function handleCategorySelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  const navigation = parseNavigation(input.value);

  if (navigation === "back") {
    saveConversationSession({ ...session, currentStep: "MAIN_MENU" }, now);
    return [mainMenuResponse(language)];
  }

  if (navigation === "next" || navigation === "previous") {
    const page = getPageNumber(session.context.categoryPage);
    const nextPage = Math.max(0, page + (navigation === "next" ? 1 : -1));
    const nextSession = saveConversationSession(
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
    saveConversationSession(session, now);
    return categorySelectionResponse(session);
  }

  const nextSession = saveConversationSession(
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
    const nextSession = saveConversationSession(
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
    const nextSession = saveConversationSession(
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
    saveConversationSession(session, now);
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
    const nextSession = saveConversationSession(
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
    const nextSession = saveConversationSession(
      {
        ...session,
        currentStep: "SELECT_CATEGORY",
        context: { ...session.context, categoryPage: 0 },
      },
      now,
    );
    return categorySelectionResponse(nextSession);
  }

  saveConversationSession(session, now);
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
  const nextSession = saveConversationSession(
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
    saveConversationSession({ ...session, currentStep: "SELECT_PRODUCT_OPTION" }, now);
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
    saveConversationSession(
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

  const withVariant = saveConversationSession(
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
    saveConversationSession({ ...withVariant, currentStep: "COLLECT_CUSTOM_FIELD" }, now);
    return [customFieldQuestionResponse(withVariant, fields[fieldIndex])];
  }

  const quantitySession = saveConversationSession(
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

  const nextSession = saveConversationSession(
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
    const nextSession = saveConversationSession(
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

  const nextSession = saveConversationSession(
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

  const nextSession = saveConversationSession(
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
    const nextSession = saveConversationSession(
      { ...session, currentStep: options.length ? "SELECT_PRODUCT_OPTION" : "PRODUCT_DETAILS" },
      now,
    );
    return options.length
      ? continuePendingItem(nextSession, now)
      : [mainMenuResponse(session.language ?? "en")];
  }

  const nextSession = saveConversationSession(
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
    const nextSession = saveConversationSession(
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
  const nextSession = saveConversationSession(
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
    const nextSession = saveConversationSession(
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
    return [
      {
        type: "text",
        text: t(
          language,
          "Checkout will be implemented in the next milestone.",
          "سيتم تنفيذ الدفع في المرحلة التالية.",
        ),
      },
    ];
  }
  if (["cart_clear", "clear cart"].includes(normalized)) {
    const nextSession = saveConversationSession(
      { ...session, context: { ...session.context, cart: [] } },
      now,
    );
    return [
      { type: "text", text: t(language, "Cart cleared.", "تم تفريغ السلة.") },
      ...(await cartMenuResponse(nextSession)),
    ];
  }
  if (["cart_remove", "remove item"].includes(normalized)) {
    const nextSession = saveConversationSession(
      { ...session, currentStep: "REMOVE_CART_ITEM" },
      now,
    );
    return removeCartItemResponse(nextSession);
  }
  if (["cart_edit", "change quantity"].includes(normalized)) {
    const nextSession = saveConversationSession({ ...session, currentStep: "EDIT_CART_ITEM" }, now);
    return editCartItemResponse(nextSession);
  }
  if (input.value.startsWith("remove_cart_item:"))
    return removeCartItemById(session, input.value.split(":")[1], now);
  if (input.value.startsWith("edit_cart_item:")) {
    const itemId = input.value.split(":")[1];
    const nextSession = saveConversationSession(
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
    const nextSession = saveConversationSession(
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
  const nextSession = saveConversationSession(
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
  const nextSession = saveConversationSession(
    { ...session, currentStep: "CART_MENU", context: { ...session.context, cart: nextCart } },
    now,
  );
  return [
    { type: "text", text: t(session.language ?? "en", "Item removed.", "تم حذف المنتج.") },
    ...(await cartMenuResponse(nextSession)),
  ];
}

async function moveToProductDetails(
  session: ConversationSession,
  product: StoreProduct,
  now: Date,
): Promise<BotResponse[]> {
  const language = session.language ?? "en";
  saveConversationSession(
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

function mainMenuResponse(language: ConversationLanguage): BotResponse {
  if (language === "ar") {
    return {
      type: "buttons",
      body: "كيف يمكننا مساعدتك؟",
      buttons: [
        { id: "main_order", title: "تقديم طلب" },
        { id: "main_question", title: "طرح سؤال" },
        { id: "main_info", title: "معلومات المتجر" },
      ],
    };
  }

  return {
    type: "buttons",
    body: "How can we help?",
    buttons: [
      { id: "main_order", title: "Place an order" },
      { id: "main_question", title: "Ask a question" },
      { id: "main_info", title: "Store information" },
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

function parseMainMenuOption(value: string) {
  const normalized = normalize(value);
  if (["1", "main_order", "place an order", "تقديم طلب"].includes(normalized)) return "order";
  if (["2", "main_question", "ask a question", "طرح سؤال"].includes(normalized)) return "question";
  if (["3", "main_info", "store information", "معلومات المتجر"].includes(normalized)) return "info";
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

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function t(language: ConversationLanguage, english: string, arabic: string) {
  return language === "ar" ? arabic : english;
}
