import "@tanstack/react-start/server-only";
import {
  DOUBLE_A_TEST_BUSINESS_ID,
  findActiveCategoryById,
  findVisibleProductByCode,
  findVisibleProductById,
  getCategoryName,
  getProductDescription,
  getProductName,
  listActiveCategories,
  listVisibleProductsByCategory,
  type StoreCategory,
  type StoreProduct,
} from "./catalog-repository.server";
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
  | {
      type: "text";
      text: string;
    }
  | {
      type: "buttons";
      body: string;
      buttons: Array<{
        id: string;
        title: string;
      }>;
    }
  | {
      type: "list";
      body: string;
      buttonText: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };

const PAGE_SIZE = 6;

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
          selectedCategoryId: undefined,
          selectedProductId: undefined,
        },
      },
      now,
    );
    return [mainMenuResponse(session.language)];
  }

  if (session.currentStep === "SELECT_LANGUAGE") {
    return handleLanguageSelection(session, input, now);
  }

  if (session.currentStep === "SELECT_CATEGORY") {
    return handleCategorySelection(session, input, now);
  }

  if (session.currentStep === "SELECT_PRODUCT") {
    return handleProductSelection(session, input, now);
  }

  if (session.currentStep === "PRODUCT_DETAILS") {
    return handleProductDetails(session, input, now);
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

  saveConversationSession(
    {
      ...session,
      language,
      currentStep: "MAIN_MENU",
    },
    now,
  );

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
  if (manualProduct) {
    return moveToProductDetails(session, manualProduct, now);
  }

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

  if (action === "order_item" && product?.isAvailable) {
    saveConversationSession(session, now);
    return [
      {
        type: "text",
        text:
          language === "ar"
            ? "اختيار الكمية والسلة سيكونان في المرحلة التالية."
            : "Quantity and cart selection come in the next milestone.",
      },
      productDetailsResponse(product, language),
    ];
  }

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
      body: language === "ar" ? "اختر فئة:" : "Choose a category:",
      buttonText: language === "ar" ? "الفئات" : "Categories",
      sections: [
        {
          title: language === "ar" ? "الفئات" : "Categories",
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
    description: `${formatPrice(product.price)} · ${getAvailabilityLabel(product, language)}`,
  }));

  return [
    {
      type: "list",
      body:
        language === "ar"
          ? `اختر منتجًا من ${category ? getCategoryName(category, language) : ""}:`
          : `Choose a product from ${category ? getCategoryName(category, language) : ""}:`,
      buttonText: language === "ar" ? "المنتجات" : "Products",
      sections: [
        {
          title: language === "ar" ? "المنتجات" : "Products",
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
  const isArabic = language === "ar";
  const body = isArabic
    ? `${getProductName(product, language)}\n\nالرمز: ${product.code}\nالسعر: ${formatPrice(
        product.price,
      )}\n${getAvailabilityLabel(product, language)}\n\n${getProductDescription(product, language)}`
    : `${getProductName(product, language)}\n\nCode: ${product.code}\nPrice: ${formatPrice(
        product.price,
      )}\n${getAvailabilityLabel(product, language)}\n\n${getProductDescription(product, language)}`;

  return {
    type: "buttons",
    body,
    buttons: product.isAvailable
      ? [
          { id: "product_order", title: isArabic ? "اطلب المنتج" : "Order this item" },
          { id: "product_back", title: isArabic ? "رجوع" : "Back to products" },
          { id: "main_menu", title: isArabic ? "القائمة" : "Main menu" },
        ]
      : [
          { id: "product_back", title: isArabic ? "رجوع" : "Back to products" },
          { id: "main_menu", title: isArabic ? "القائمة" : "Main menu" },
        ],
  };
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

  if (["product_order", "order this item", "اطلب المنتج", "اطلب هذا المنتج"].includes(normalized)) {
    return "order_item";
  }
  if (["product_back", "back to products", "رجوع"].includes(normalized)) return "back_to_products";

  return undefined;
}

function getGlobalCommand(value: string): "restart" | "menu" | undefined {
  const normalized = normalize(value);

  if (["restart", "start", "إعادة"].includes(normalized)) return "restart";
  if (["menu", "main_menu", "القائمة"].includes(normalized)) return "menu";

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

  if (hasPreviousPage) {
    rows.push({ id: "previous_page", title: language === "ar" ? "السابق" : "Previous page" });
  }

  if (hasNextPage) {
    rows.push({ id: "next_page", title: language === "ar" ? "التالي" : "Next page" });
  }

  if (includeBack) {
    rows.push({ id: "back", title: language === "ar" ? "رجوع" : "Back" });
  }

  rows.push({ id: "main_menu", title: language === "ar" ? "القائمة" : "Main menu" });

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
  if (product.isAvailable) return language === "ar" ? "متوفر" : "Available";
  return language === "ar" ? "غير متوفر" : "Unavailable";
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
