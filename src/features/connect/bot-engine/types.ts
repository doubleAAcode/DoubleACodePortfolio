export type BotLanguage = "en" | "ar";

export type Business = {
  id: string;
  name: string;
  phone: string;
  supportedLanguages: BotLanguage[];
  defaultLanguage: BotLanguage;
};

export type Category = {
  id: string;
  businessId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type Product = {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  stockQuantity: number;
  isActive: boolean;
};

export type ProductVariant = {
  id: string;
  businessId: string;
  productId: string;
  variantType: string;
  name: string;
  priceDelta: number;
  stockQuantity: number;
  isActive: boolean;
};

export type OrderStatus = "confirmed" | "canceled";

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  businessId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

export type ConversationStep =
  | "START"
  | "SELECT_LANGUAGE"
  | "MAIN_MENU"
  | "SELECT_CATEGORY"
  | "SELECT_PRODUCT"
  | "SELECT_VARIANTS"
  | "SELECT_QUANTITY"
  | "ADD_MORE_OR_CHECKOUT"
  | "COLLECT_CUSTOMER_NAME"
  | "COLLECT_PHONE"
  | "COLLECT_DELIVERY_ADDRESS"
  | "ORDER_SUMMARY"
  | "CONFIRM_ORDER"
  | "ORDER_CREATED";

export type CartItem = {
  productId: string;
  variantId?: string;
  quantity: number;
};

export type ConversationSession = {
  id: string;
  businessId: string;
  customerPhone: string;
  step: ConversationStep;
  language?: BotLanguage;
  selectedCategoryId?: string;
  selectedProductId?: string;
  selectedVariantId?: string;
  cart: CartItem[];
  customerName?: string;
  checkoutPhone?: string;
  deliveryAddress?: string;
  confirmedOrderId?: string;
  updatedAt: string;
};

export type StoreBotState = {
  businesses: Business[];
  categories: Category[];
  products: Product[];
  variants: ProductVariant[];
  orders: Order[];
  sessions: ConversationSession[];
};

export type ProcessIncomingMessageInput = {
  businessId: string;
  customerPhone: string;
  message: string;
};

export type BotResponse = {
  messages: string[];
  quickReplies: string[];
  session: ConversationSession;
  order?: Order;
  debug: {
    previousStep: ConversationStep;
    nextStep: ConversationStep;
    cartTotal: number;
    cartItemCount: number;
  };
};
