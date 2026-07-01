import "@tanstack/react-start/server-only";

export type ConversationStep =
  | "SELECT_LANGUAGE"
  | "MAIN_MENU"
  | "SELECT_CATEGORY"
  | "SELECT_PRODUCT"
  | "PRODUCT_DETAILS"
  | "SELECT_PRODUCT_OPTION"
  | "COLLECT_CUSTOM_FIELD"
  | "SELECT_QUANTITY"
  | "CART_MENU"
  | "EDIT_CART_ITEM"
  | "REMOVE_CART_ITEM"
  | "CHANGE_CART_ITEM_QUANTITY"
  | "COLLECT_CUSTOMER_NAME"
  | "SELECT_FULFILLMENT_METHOD"
  | "SELECT_DELIVERY_AREA"
  | "SELECT_PICKUP_LOCATION"
  | "COLLECT_DELIVERY_ADDRESS"
  | "SELECT_PAYMENT_METHOD"
  | "COLLECT_ORDER_NOTES"
  | "REVIEW_ORDER"
  | "CONFIRM_ORDER"
  | "ORDER_CREATED";
export type ConversationLanguage = "en" | "ar";

export type ConversationSession = {
  businessId: string;
  customerPhone: string;
  currentStep: ConversationStep;
  language?: ConversationLanguage;
  context: Record<string, unknown>;
  lastCustomerMessageAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map<string, ConversationSession>();

export function getActiveConversationSession({
  businessId,
  customerPhone,
  now = new Date(),
}: {
  businessId: string;
  customerPhone: string;
  now?: Date;
}) {
  const session = sessions.get(getSessionKey(businessId, customerPhone));

  if (!session) return undefined;

  if (new Date(session.expiresAt).getTime() <= now.getTime()) {
    deleteConversationSession({ businessId, customerPhone });
    return undefined;
  }

  return session;
}

export function createConversationSession({
  businessId,
  customerPhone,
  now = new Date(),
}: {
  businessId: string;
  customerPhone: string;
  now?: Date;
}) {
  const timestamp = now.toISOString();
  const session: ConversationSession = {
    businessId,
    customerPhone,
    currentStep: "SELECT_LANGUAGE",
    context: {},
    lastCustomerMessageAt: timestamp,
    expiresAt: getExpiresAt(now),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  sessions.set(getSessionKey(businessId, customerPhone), session);
  return session;
}

export function saveConversationSession(session: ConversationSession, now = new Date()) {
  const timestamp = now.toISOString();
  const nextSession: ConversationSession = {
    ...session,
    lastCustomerMessageAt: timestamp,
    expiresAt: getExpiresAt(now),
    updatedAt: timestamp,
  };

  sessions.set(getSessionKey(session.businessId, session.customerPhone), nextSession);
  return nextSession;
}

export function deleteConversationSession({
  businessId,
  customerPhone,
}: {
  businessId: string;
  customerPhone: string;
}) {
  sessions.delete(getSessionKey(businessId, customerPhone));
}

function getSessionKey(businessId: string, customerPhone: string) {
  return `${businessId}:${customerPhone}`;
}

function getExpiresAt(now: Date) {
  return new Date(now.getTime() + SESSION_TTL_MS).toISOString();
}
