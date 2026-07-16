import "@tanstack/react-start/server-only";

import { createHash, randomUUID } from "node:crypto";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import { maskCustomerIdentifier } from "./reliability";

export type WaMessageDirection = "INBOUND" | "OUTBOUND" | "SYSTEM";
export type WaMessageSenderType = "CUSTOMER" | "BOT" | "HUMAN" | "SYSTEM";
export type WaMessageType =
  | "text"
  | "button"
  | "list"
  | "template"
  | "image"
  | "audio"
  | "document"
  | "unknown";
export type WaMessageStatus = "received" | "sent" | "failed" | "delivered" | "read" | "unknown";

export type WaMessageEventRow = {
  id: string;
  business_id: string | null;
  connection_id: string | null;
  phone_number_id: string | null;
  customer_phone_masked: string | null;
  customer_phone_hash: string | null;
  direction: WaMessageDirection;
  sender_type: WaMessageSenderType;
  message_type: WaMessageType;
  body: string | null;
  summary: string | null;
  meta_message_id: string | null;
  status: WaMessageStatus | null;
  error_code: string | null;
  error_message: string | null;
  raw_payload?: Record<string, unknown> | null;
  created_at: string;
};

export type WaMessageEventInput = {
  businessId?: string;
  connectionId?: string;
  phoneNumberId?: string;
  customerPhone?: string;
  direction: WaMessageDirection;
  senderType: WaMessageSenderType;
  messageType: WaMessageType;
  body?: string;
  summary?: string;
  metaMessageId?: string;
  status?: WaMessageStatus;
  errorCode?: string;
  errorMessage?: string;
  rawPayload?: Record<string, unknown>;
};

const inMemoryEvents: WaMessageEventRow[] = [];
const MAX_EVENTS = 100;

export async function recordWaMessageEvent(input: WaMessageEventInput) {
  const row = toRow(input);

  if (!isServerSupabaseConfigured()) {
    inMemoryEvents.unshift(row);
    inMemoryEvents.splice(MAX_EVENTS);
    return row;
  }

  try {
    const rows = await supabaseServerRest<WaMessageEventRow[]>("/wa_message_events", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify(row),
    });
    return rows[0] ?? row;
  } catch (error) {
    console.error("[wa-message-events] insert failed", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return row;
  }
}

export async function listWaMessageEvents({
  connectionId,
  businessId,
  customerPhone,
  limit = 50,
}: {
  connectionId?: string;
  businessId?: string;
  customerPhone?: string;
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_EVENTS);
  const customerPhoneHash = customerPhone ? hashPhone(customerPhone) : "";

  if (!isServerSupabaseConfigured()) {
    return inMemoryEvents
      .filter((event) => {
        if (connectionId && event.connection_id !== connectionId) return false;
        if (businessId && event.business_id !== businessId) return false;
        if (customerPhoneHash && event.customer_phone_hash !== customerPhoneHash) return false;
        return true;
      })
      .slice(0, safeLimit);
  }

  const filters = [
    connectionId ? `connection_id=eq.${encodeURIComponent(connectionId)}` : "",
    businessId ? `business_id=eq.${encodeURIComponent(businessId)}` : "",
    customerPhoneHash ? `customer_phone_hash=eq.${encodeURIComponent(customerPhoneHash)}` : "",
  ].filter(Boolean);
  const query = filters.length ? `&${filters.join("&")}` : "";
  return supabaseServerRest<WaMessageEventRow[]>(
    `/wa_message_events?select=id,business_id,connection_id,phone_number_id,customer_phone_masked,customer_phone_hash,direction,sender_type,message_type,body,summary,meta_message_id,status,error_code,error_message,created_at&order=created_at.desc&limit=${safeLimit}${query}`,
  );
}

function toRow(input: WaMessageEventInput): WaMessageEventRow {
  return {
    id: randomUUID(),
    business_id: input.businessId ?? null,
    connection_id: input.connectionId ?? null,
    phone_number_id: input.phoneNumberId ?? null,
    customer_phone_masked: input.customerPhone ? maskCustomerIdentifier(input.customerPhone) : null,
    customer_phone_hash: input.customerPhone ? hashPhone(input.customerPhone) : null,
    direction: input.direction,
    sender_type: input.senderType,
    message_type: input.messageType,
    body: cleanText(input.body),
    summary: cleanText(input.summary),
    meta_message_id: input.metaMessageId ?? null,
    status: input.status ?? "unknown",
    error_code: cleanText(input.errorCode),
    error_message: cleanText(input.errorMessage),
    raw_payload: sanitizeRawPayload(input.rawPayload),
    created_at: new Date().toISOString(),
  };
}

function cleanText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 4000) : null;
}

function hashPhone(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sanitizeRawPayload(payload?: Record<string, unknown>) {
  if (!payload) return null;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    sanitized[key] = /token|secret|authorization|key/i.test(key) ? "[redacted]" : value;
  }
  return sanitized;
}
