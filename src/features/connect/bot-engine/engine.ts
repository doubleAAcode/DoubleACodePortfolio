import { makeId, updateStoreBotState } from "./storage";
import type {
  BotLanguage,
  BotResponse,
  CartItem,
  ConversationSession,
  ConversationStep,
  Order,
  OrderItem,
  ProcessIncomingMessageInput,
  Product,
  ProductVariant,
  StoreBotState,
} from "./types";

type EngineResult = {
  state: StoreBotState;
  response: BotResponse;
};

type StepResult = {
  session: ConversationSession;
  messages: string[];
  quickReplies: string[];
  order?: Order;
};

const BACK_STEPS: Partial<Record<ConversationStep, ConversationStep>> = {
  SELECT_PRODUCT: "SELECT_CATEGORY",
  SELECT_VARIANTS: "SELECT_PRODUCT",
  SELECT_QUANTITY: "SELECT_PRODUCT",
  ADD_MORE_OR_CHECKOUT: "SELECT_CATEGORY",
  COLLECT_CUSTOMER_NAME: "ADD_MORE_OR_CHECKOUT",
  COLLECT_PHONE: "COLLECT_CUSTOMER_NAME",
  COLLECT_DELIVERY_ADDRESS: "COLLECT_PHONE",
  ORDER_SUMMARY: "COLLECT_DELIVERY_ADDRESS",
  CONFIRM_ORDER: "ORDER_SUMMARY",
};

export async function processIncomingMessage(
  input: ProcessIncomingMessageInput,
): Promise<BotResponse> {
  let response: BotResponse | undefined;

  updateStoreBotState((state) => {
    const result = runStateMachine(state, input);
    response = result.response;
    return result.state;
  });

  if (!response) throw new Error("Bot did not produce a response.");
  return response;
}

function runStateMachine(state: StoreBotState, input: ProcessIncomingMessageInput): EngineResult {
  const existing = state.sessions.find(
    (session) =>
      session.businessId === input.businessId && session.customerPhone === input.customerPhone,
  );
  const session = existing ?? createSession(input.businessId, input.customerPhone);
  const previousStep = session.step;
  const message = input.message.trim();
  const normalized = message.toLowerCase();
  let order: Order | undefined;

  if (!state.businesses.some((business) => business.id === input.businessId)) {
    throw new Error("Business not found.");
  }

  let nextSession = { ...session, updatedAt: new Date().toISOString() };
  let messages: string[] = [];
  let quickReplies: string[] = [];

  if (isRestart(normalized)) {
    nextSession = createSession(input.businessId, input.customerPhone, nextSession.language);
    messages = ["Fresh start. Choose a language.", "1. English", "2. العربية"];
    quickReplies = ["1", "2"];
  } else if (isCancel(normalized)) {
    nextSession = createSession(input.businessId, input.customerPhone, nextSession.language);
    nextSession.step = "MAIN_MENU";
    messages = ["Order canceled. What would you like to do next?", "1. Browse menu"];
    quickReplies = ["1"];
  } else if (isMainMenu(normalized)) {
    nextSession = {
      ...nextSession,
      step: "MAIN_MENU",
      selectedCategoryId: undefined,
      selectedProductId: undefined,
      selectedVariantId: undefined,
    };
    ({ messages, quickReplies } = mainMenuResponse());
  } else if (isBack(normalized)) {
    const backStep = BACK_STEPS[nextSession.step] ?? "MAIN_MENU";
    nextSession = { ...nextSession, step: backStep };
    ({ session: nextSession, messages, quickReplies } = responseForStep(state, nextSession));
  } else {
    const result = advanceSession(state, nextSession, message);
    nextSession = result.session;
    messages = result.messages;
    quickReplies = result.quickReplies;
    order = result.order;
  }

  const sessions = [
    ...state.sessions.filter(
      (stored) =>
        !(stored.businessId === input.businessId && stored.customerPhone === input.customerPhone),
    ),
    nextSession,
  ];
  const nextState = order ? applyConfirmedOrder(state, sessions, order) : { ...state, sessions };

  return {
    state: nextState,
    response: {
      messages,
      quickReplies,
      session: nextSession,
      order,
      debug: {
        previousStep,
        nextStep: nextSession.step,
        cartTotal: getCartTotal(nextState, nextSession.cart),
        cartItemCount: nextSession.cart.reduce((sum, item) => sum + item.quantity, 0),
      },
    },
  };
}

function advanceSession(
  state: StoreBotState,
  session: ConversationSession,
  message: string,
): StepResult {
  switch (session.step) {
    case "START":
    case "SELECT_LANGUAGE":
      return selectLanguage(session, message);
    case "MAIN_MENU":
      return openCategories(state, session, message);
    case "SELECT_CATEGORY":
      return selectCategory(state, session, message);
    case "SELECT_PRODUCT":
      return selectProduct(state, session, message);
    case "SELECT_VARIANTS":
      return selectVariant(state, session, message);
    case "SELECT_QUANTITY":
      return selectQuantity(state, session, message);
    case "ADD_MORE_OR_CHECKOUT":
      return addMoreOrCheckout(state, session, message);
    case "COLLECT_CUSTOMER_NAME":
      return collectCustomerName(session, message);
    case "COLLECT_PHONE":
      return collectPhone(session, message);
    case "COLLECT_DELIVERY_ADDRESS":
      return collectAddress(state, session, message);
    case "ORDER_SUMMARY":
    case "CONFIRM_ORDER":
      return confirmOrder(state, session, message);
    case "ORDER_CREATED":
      return {
        session,
        messages: ["This order is already confirmed. Type restart to begin a new one."],
        quickReplies: ["restart"],
      };
  }
}

function selectLanguage(session: ConversationSession, message: string) {
  const language: BotLanguage | undefined =
    message === "2" || message.toLowerCase().includes("arab") ? "ar" : "en";
  const nextSession = { ...session, language, step: "MAIN_MENU" as const };
  return {
    session: nextSession,
    ...mainMenuResponse(),
  };
}

function openCategories(state: StoreBotState, session: ConversationSession, message: string) {
  if (message && message !== "1") {
    return {
      session,
      messages: ["Choose 1 to browse the menu, or type restart."],
      quickReplies: ["1", "restart"],
    };
  }
  const nextSession = { ...session, step: "SELECT_CATEGORY" as const };
  return { session: nextSession, ...categoryResponse(state, session.businessId) };
}

function selectCategory(state: StoreBotState, session: ConversationSession, message: string) {
  const categories = activeCategories(state, session.businessId);
  const category =
    pickByNumber(categories, message) ??
    categories.find((item) => item.name.toLowerCase() === message.toLowerCase());
  if (!category) {
    return {
      session,
      messages: ["Pick a category number."],
      quickReplies: categoryReplies(categories),
    };
  }

  const nextSession = {
    ...session,
    selectedCategoryId: category.id,
    step: "SELECT_PRODUCT" as const,
  };
  return { session: nextSession, ...productResponse(state, nextSession) };
}

function selectProduct(state: StoreBotState, session: ConversationSession, message: string) {
  const products = activeProductsForCategory(state, session.businessId, session.selectedCategoryId);
  const product =
    pickByNumber(products, message) ??
    products.find((item) => item.name.toLowerCase() === message.toLowerCase());
  if (!product) {
    return {
      session,
      messages: ["Pick an available product number."],
      quickReplies: numberedReplies(products),
    };
  }

  const variants = activeVariantsForProduct(state, session.businessId, product.id);
  if (variants.length > 0) {
    const nextSession = {
      ...session,
      selectedProductId: product.id,
      step: "SELECT_VARIANTS" as const,
    };
    return { session: nextSession, ...variantResponse(state, nextSession) };
  }

  const nextSession = {
    ...session,
    selectedProductId: product.id,
    selectedVariantId: undefined,
    step: "SELECT_QUANTITY" as const,
  };
  return { session: nextSession, ...quantityResponse(state, nextSession) };
}

function selectVariant(state: StoreBotState, session: ConversationSession, message: string) {
  const variants = activeVariantsForProduct(state, session.businessId, session.selectedProductId);
  const variant =
    pickByNumber(variants, message) ??
    variants.find((item) => item.name.toLowerCase() === message.toLowerCase());
  if (!variant) {
    return {
      session,
      messages: ["Pick a variant number."],
      quickReplies: numberedReplies(variants),
    };
  }
  const nextSession = {
    ...session,
    selectedVariantId: variant.id,
    step: "SELECT_QUANTITY" as const,
  };
  return { session: nextSession, ...quantityResponse(state, nextSession) };
}

function selectQuantity(state: StoreBotState, session: ConversationSession, message: string) {
  const quantity = Number.parseInt(message, 10);
  const available = getSelectedAvailableStock(state, session);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      session,
      messages: ["Send a quantity as a number."],
      quickReplies: quantityReplies(available),
    };
  }
  const existingCartQuantity = session.cart
    .filter(
      (item) =>
        item.productId === session.selectedProductId &&
        item.variantId === session.selectedVariantId,
    )
    .reduce((sum, item) => sum + item.quantity, 0);
  if (quantity + existingCartQuantity > available) {
    return {
      session,
      messages: [
        `Only ${available} available. You already have ${existingCartQuantity} in the cart.`,
      ],
      quickReplies: quantityReplies(available),
    };
  }

  const cart = mergeCartItem(session.cart, {
    productId: session.selectedProductId ?? "",
    variantId: session.selectedVariantId,
    quantity,
  });
  const nextSession = {
    ...session,
    cart,
    selectedProductId: undefined,
    selectedVariantId: undefined,
    step: "ADD_MORE_OR_CHECKOUT" as const,
  };
  return {
    session: nextSession,
    messages: ["Added to cart.", formatCart(state, cart), "1. Add more", "2. Checkout"],
    quickReplies: ["1", "2"],
  };
}

function addMoreOrCheckout(state: StoreBotState, session: ConversationSession, message: string) {
  if (message === "1") {
    const nextSession = { ...session, step: "SELECT_CATEGORY" as const };
    return { session: nextSession, ...categoryResponse(state, session.businessId) };
  }
  if (message === "2") {
    const nextSession = { ...session, step: "COLLECT_CUSTOMER_NAME" as const };
    return {
      session: nextSession,
      messages: ["What name should we put on the order?"],
      quickReplies: [],
    };
  }
  return {
    session,
    messages: ["Choose 1 to add more or 2 to checkout."],
    quickReplies: ["1", "2"],
  };
}

function collectCustomerName(session: ConversationSession, message: string) {
  if (message.length < 2) {
    return { session, messages: ["Please send the customer's name."], quickReplies: [] };
  }
  const nextSession = { ...session, customerName: message, step: "COLLECT_PHONE" as const };
  return {
    session: nextSession,
    messages: ["Send the delivery phone number."],
    quickReplies: [session.customerPhone],
  };
}

function collectPhone(session: ConversationSession, message: string) {
  if (message.replace(/\D/g, "").length < 7) {
    return {
      session,
      messages: ["That phone number looks too short. Send it again."],
      quickReplies: [],
    };
  }
  const nextSession = {
    ...session,
    checkoutPhone: message,
    step: "COLLECT_DELIVERY_ADDRESS" as const,
  };
  return { session: nextSession, messages: ["Send the delivery address."], quickReplies: [] };
}

function collectAddress(state: StoreBotState, session: ConversationSession, message: string) {
  if (message.length < 6) {
    return {
      session,
      messages: ["Please send a more complete delivery address."],
      quickReplies: [],
    };
  }
  const nextSession = { ...session, deliveryAddress: message, step: "ORDER_SUMMARY" as const };
  return {
    session: nextSession,
    messages: [
      formatOrderSummary(state, nextSession),
      "Confirm this order?",
      "1. Confirm",
      "2. Cancel",
    ],
    quickReplies: ["1", "2"],
  };
}

function confirmOrder(state: StoreBotState, session: ConversationSession, message: string) {
  if (session.confirmedOrderId) {
    return {
      session: { ...session, step: "ORDER_CREATED" as const },
      messages: ["This order is already confirmed."],
      quickReplies: ["restart"],
    };
  }
  if (message === "2" || isCancel(message.toLowerCase())) {
    const nextSession = createSession(session.businessId, session.customerPhone, session.language);
    nextSession.step = "MAIN_MENU";
    return { session: nextSession, messages: ["Order canceled."], quickReplies: ["1"] };
  }
  if (message !== "1" && message.toLowerCase() !== "confirm") {
    return { session, messages: ["Choose 1 to confirm or 2 to cancel."], quickReplies: ["1", "2"] };
  }

  const stockError = findStockError(state, session.cart);
  if (stockError) {
    return {
      session: { ...session, step: "ADD_MORE_OR_CHECKOUT" as const },
      messages: [stockError, "Please update your cart or restart."],
      quickReplies: ["restart"],
    };
  }

  const order = buildOrder(state, session);
  const nextSession = { ...session, confirmedOrderId: order.id, step: "ORDER_CREATED" as const };
  return {
    session: nextSession,
    order,
    messages: [`Order ${order.orderNumber} confirmed. Total: $${order.total.toFixed(2)}.`],
    quickReplies: ["restart"],
  };
}

function responseForStep(state: StoreBotState, session: ConversationSession) {
  switch (session.step) {
    case "SELECT_CATEGORY":
      return { session, ...categoryResponse(state, session.businessId) };
    case "SELECT_PRODUCT":
      return { session, ...productResponse(state, session) };
    case "SELECT_VARIANTS":
      return { session, ...variantResponse(state, session) };
    case "SELECT_QUANTITY":
      return { session, ...quantityResponse(state, session) };
    case "ADD_MORE_OR_CHECKOUT":
      return {
        session,
        messages: [formatCart(state, session.cart), "1. Add more", "2. Checkout"],
        quickReplies: ["1", "2"],
      };
    default:
      return { session: { ...session, step: "MAIN_MENU" as const }, ...mainMenuResponse() };
  }
}

function mainMenuResponse() {
  return {
    messages: ["Welcome. What would you like to do?", "1. Browse menu"],
    quickReplies: ["1"],
  };
}

function categoryResponse(state: StoreBotState, businessId: string) {
  const categories = activeCategories(state, businessId);
  return {
    messages: [
      "Choose a category.",
      ...categories.map((category, index) => `${index + 1}. ${category.name}`),
    ],
    quickReplies: categoryReplies(categories),
  };
}

function productResponse(state: StoreBotState, session: ConversationSession) {
  const products = activeProductsForCategory(state, session.businessId, session.selectedCategoryId);
  return {
    messages: [
      "Choose a product.",
      ...products.map(
        (product, index) =>
          `${index + 1}. ${product.name} - $${product.basePrice.toFixed(2)} (${getProductAvailableStock(state, product)} left)`,
      ),
    ],
    quickReplies: numberedReplies(products),
  };
}

function variantResponse(state: StoreBotState, session: ConversationSession) {
  const variants = activeVariantsForProduct(state, session.businessId, session.selectedProductId);
  return {
    messages: [
      "Choose an option.",
      ...variants.map(
        (variant, index) =>
          `${index + 1}. ${variant.name} ${variant.priceDelta ? `+$${variant.priceDelta.toFixed(2)}` : ""} (${variant.stockQuantity} left)`,
      ),
    ],
    quickReplies: numberedReplies(variants),
  };
}

function quantityResponse(state: StoreBotState, session: ConversationSession) {
  const available = getSelectedAvailableStock(state, session);
  return {
    messages: [`How many? ${available} available.`],
    quickReplies: quantityReplies(available),
  };
}

function createSession(
  businessId: string,
  customerPhone: string,
  language?: BotLanguage,
): ConversationSession {
  return {
    id: makeId("session"),
    businessId,
    customerPhone,
    step: language ? "MAIN_MENU" : "SELECT_LANGUAGE",
    language,
    cart: [],
    updatedAt: new Date().toISOString(),
  };
}

function buildOrder(state: StoreBotState, session: ConversationSession): Order {
  const id = makeId("order");
  const items: OrderItem[] = session.cart.map((cartItem) => {
    const product = state.products.find((item) => item.id === cartItem.productId);
    const variant = state.variants.find((item) => item.id === cartItem.variantId);
    if (!product) throw new Error("Product missing from cart.");
    const unitPrice = product.basePrice + (variant?.priceDelta ?? 0);
    return {
      id: makeId("item"),
      orderId: id,
      productId: product.id,
      variantId: variant?.id,
      productName: product.name,
      variantName: variant?.name,
      quantity: cartItem.quantity,
      unitPrice,
      lineTotal: unitPrice * cartItem.quantity,
    };
  });
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return {
    id,
    businessId: session.businessId,
    orderNumber: `BOT-${String(state.orders.length + 1).padStart(4, "0")}`,
    customerName: session.customerName ?? "Customer",
    customerPhone: session.checkoutPhone ?? session.customerPhone,
    deliveryAddress: session.deliveryAddress ?? "",
    status: "confirmed",
    total,
    createdAt: new Date().toISOString(),
    items,
  };
}

function applyConfirmedOrder(
  state: StoreBotState,
  sessions: ConversationSession[],
  order: Order,
): StoreBotState {
  const variants = state.variants.map((variant) => {
    const ordered = order.items
      .filter((item) => item.variantId === variant.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    return ordered > 0
      ? { ...variant, stockQuantity: Math.max(0, variant.stockQuantity - ordered) }
      : variant;
  });
  const products = state.products.map((product) => {
    const ordered = order.items
      .filter((item) => item.productId === product.id && !item.variantId)
      .reduce((sum, item) => sum + item.quantity, 0);
    return ordered > 0
      ? { ...product, stockQuantity: Math.max(0, product.stockQuantity - ordered) }
      : product;
  });
  return { ...state, products, variants, orders: [order, ...state.orders], sessions };
}

function findStockError(state: StoreBotState, cart: CartItem[]) {
  for (const item of cart) {
    const product = state.products.find((entry) => entry.id === item.productId);
    const variant = state.variants.find((entry) => entry.id === item.variantId);
    const available = variant?.stockQuantity ?? product?.stockQuantity ?? 0;
    if (!product || !product.isActive || available < item.quantity) {
      return `${product?.name ?? "An item"} is no longer available in the requested quantity.`;
    }
  }
  return "";
}

function formatOrderSummary(state: StoreBotState, session: ConversationSession) {
  return [
    "Order summary",
    formatCart(state, session.cart),
    `Name: ${session.customerName}`,
    `Phone: ${session.checkoutPhone}`,
    `Address: ${session.deliveryAddress}`,
  ].join("\n");
}

function formatCart(state: StoreBotState, cart: CartItem[]) {
  if (cart.length === 0) return "Cart is empty.";
  const lines = cart.map((item) => {
    const product = state.products.find((entry) => entry.id === item.productId);
    const variant = state.variants.find((entry) => entry.id === item.variantId);
    const unitPrice = (product?.basePrice ?? 0) + (variant?.priceDelta ?? 0);
    return `${item.quantity} x ${product?.name ?? "Product"}${variant ? ` (${variant.name})` : ""} - $${(unitPrice * item.quantity).toFixed(2)}`;
  });
  return [...lines, `Total: $${getCartTotal(state, cart).toFixed(2)}`].join("\n");
}

function getCartTotal(state: StoreBotState, cart: CartItem[]) {
  return cart.reduce((sum, item) => {
    const product = state.products.find((entry) => entry.id === item.productId);
    const variant = state.variants.find((entry) => entry.id === item.variantId);
    return sum + ((product?.basePrice ?? 0) + (variant?.priceDelta ?? 0)) * item.quantity;
  }, 0);
}

function getSelectedAvailableStock(state: StoreBotState, session: ConversationSession) {
  const variant = state.variants.find((item) => item.id === session.selectedVariantId);
  const product = state.products.find((item) => item.id === session.selectedProductId);
  return variant?.stockQuantity ?? product?.stockQuantity ?? 0;
}

function getProductAvailableStock(state: StoreBotState, product: Product) {
  const variants = activeVariantsForProduct(state, product.businessId, product.id);
  if (variants.length > 0) return variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
  return product.stockQuantity;
}

function activeCategories(state: StoreBotState, businessId: string) {
  return state.categories
    .filter((category) => category.businessId === businessId && category.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function activeProductsForCategory(state: StoreBotState, businessId: string, categoryId?: string) {
  return state.products.filter(
    (product) =>
      product.businessId === businessId &&
      product.categoryId === categoryId &&
      product.isActive &&
      getProductAvailableStock(state, product) > 0,
  );
}

function activeVariantsForProduct(state: StoreBotState, businessId: string, productId?: string) {
  return state.variants.filter(
    (variant) =>
      variant.businessId === businessId &&
      variant.productId === productId &&
      variant.isActive &&
      variant.stockQuantity > 0,
  );
}

function mergeCartItem(cart: CartItem[], next: CartItem) {
  const existing = cart.find(
    (item) => item.productId === next.productId && item.variantId === next.variantId,
  );
  if (!existing) return [...cart, next];
  return cart.map((item) =>
    item.productId === next.productId && item.variantId === next.variantId
      ? { ...item, quantity: item.quantity + next.quantity }
      : item,
  );
}

function pickByNumber<T>(items: T[], value: string) {
  const index = Number.parseInt(value, 10) - 1;
  return Number.isFinite(index) ? items[index] : undefined;
}

function numberedReplies(items: unknown[]) {
  return items.map((_, index) => String(index + 1));
}

function categoryReplies(items: unknown[]) {
  return numberedReplies(items);
}

function quantityReplies(available: number) {
  return Array.from({ length: Math.min(available, 5) }, (_, index) => String(index + 1));
}

function isRestart(value: string) {
  return ["restart", "start over", "reset"].includes(value);
}

function isCancel(value: string) {
  return ["cancel", "stop"].includes(value);
}

function isMainMenu(value: string) {
  return ["menu", "main", "main menu"].includes(value);
}

function isBack(value: string) {
  return ["back", "previous"].includes(value);
}
