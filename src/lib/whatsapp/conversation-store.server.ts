import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

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
  | "USE_SAVED_CUSTOMER_DETAILS"
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

type ConversationSessionRow = {
  business_id: string;
  customer_phone: string;
  current_step: ConversationStep;
  language: ConversationLanguage | null;
  context: Record<string, unknown>;
  last_customer_message_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

const validSteps: ReadonlySet<ConversationStep> = new Set([
  "SELECT_LANGUAGE",
  "MAIN_MENU",
  "SELECT_CATEGORY",
  "SELECT_PRODUCT",
  "PRODUCT_DETAILS",
  "SELECT_PRODUCT_OPTION",
  "COLLECT_CUSTOM_FIELD",
  "SELECT_QUANTITY",
  "CART_MENU",
  "EDIT_CART_ITEM",
  "REMOVE_CART_ITEM",
  "CHANGE_CART_ITEM_QUANTITY",
  "USE_SAVED_CUSTOMER_DETAILS",
  "COLLECT_CUSTOMER_NAME",
  "SELECT_FULFILLMENT_METHOD",
  "SELECT_DELIVERY_AREA",
  "SELECT_PICKUP_LOCATION",
  "COLLECT_DELIVERY_ADDRESS",
  "SELECT_PAYMENT_METHOD",
  "COLLECT_ORDER_NOTES",
  "REVIEW_ORDER",
  "CONFIRM_ORDER",
  "ORDER_CREATED",
]);

export async function getActiveConversationSession({
  businessId,
  customerPhone,
  now = new Date(),
}: {
  businessId: string;
  customerPhone: string;
  now?: Date;
}) {
  const session = isServerSupabaseConfigured()
    ? await getSupabaseSession(businessId, customerPhone)
    : sessions.get(getSessionKey(businessId, customerPhone));

  if (!session) return undefined;

  if (new Date(session.expiresAt).getTime() <= now.getTime()) {
    await deleteConversationSession({ businessId, customerPhone });
    return undefined;
  }

  return session;
}

export async function createConversationSession({
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

  await persistConversationSession(session);
  return session;
}

export async function saveConversationSession(session: ConversationSession, now = new Date()) {
  const timestamp = now.toISOString();
  const nextSession: ConversationSession = {
    ...session,
    lastCustomerMessageAt: timestamp,
    expiresAt: getExpiresAt(now),
    updatedAt: timestamp,
  };

  await persistConversationSession(nextSession);
  return nextSession;
}

export async function deleteConversationSession({
  businessId,
  customerPhone,
}: {
  businessId: string;
  customerPhone: string;
}) {
  if (!isServerSupabaseConfigured()) {
    sessions.delete(getSessionKey(businessId, customerPhone));
    return;
  }

  await supabaseServerRest(
    `/wa_conversation_sessions?business_id=eq.${encodeURIComponent(
      businessId,
    )}&customer_phone=eq.${encodeURIComponent(customerPhone)}`,
    { method: "DELETE" },
  );
}

function getSessionKey(businessId: string, customerPhone: string) {
  return `${businessId}:${customerPhone}`;
}

function getExpiresAt(now: Date) {
  return new Date(now.getTime() + SESSION_TTL_MS).toISOString();
}

async function getSupabaseSession(businessId: string, customerPhone: string) {
  const rows = await supabaseServerRest<ConversationSessionRow[]>(
    `/wa_conversation_sessions?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&customer_phone=eq.${encodeURIComponent(customerPhone)}&limit=1`,
  );

  const row = rows[0];
  return row ? fromRow(row) : undefined;
}

async function persistConversationSession(session: ConversationSession) {
  if (!isServerSupabaseConfigured()) {
    sessions.set(getSessionKey(session.businessId, session.customerPhone), session);
    return;
  }

  await supabaseServerRest<ConversationSessionRow[]>(
    "/wa_conversation_sessions?on_conflict=business_id,customer_phone",
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify(toRow(session)),
    },
  );
}

function fromRow(row: ConversationSessionRow): ConversationSession {
  const validated = validateStoredSessionRow(row);
  return {
    businessId: row.business_id,
    customerPhone: row.customer_phone,
    currentStep: validated.currentStep,
    language: validated.language,
    context: validated.context,
    lastCustomerMessageAt: row.last_customer_message_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateStoredSessionRow(row: ConversationSessionRow) {
  const language = row.language === "en" || row.language === "ar" ? row.language : undefined;
  const context =
    row.context && typeof row.context === "object" && !Array.isArray(row.context)
      ? row.context
      : {};
  let currentStep: ConversationStep = validSteps.has(row.current_step)
    ? row.current_step
    : language
      ? "MAIN_MENU"
      : "SELECT_LANGUAGE";

  if (currentStep !== row.current_step || context !== row.context || language !== row.language) {
    console.warn("[whatsapp:session] recovered malformed stored session", {
      businessId: row.business_id,
      customer: maskPhone(row.customer_phone),
      storedStep: row.current_step,
      recoveredStep: currentStep,
      hadValidContext: context === row.context,
      hadValidLanguage: language === row.language,
    });
  }

  if (!language && currentStep !== "SELECT_LANGUAGE") {
    currentStep = "SELECT_LANGUAGE";
  }

  return { currentStep, language, context };
}

function toRow(session: ConversationSession): ConversationSessionRow {
  return {
    business_id: session.businessId,
    customer_phone: session.customerPhone,
    current_step: session.currentStep,
    language: session.language ?? null,
    context: session.context,
    last_customer_message_at: session.lastCustomerMessageAt,
    expires_at: session.expiresAt,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

function maskPhone(phone: string) {
  if (phone.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}
