import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import type { IncomingWhatsAppMessage, IncomingWhatsAppStatus } from "./parser.server";

export type InboundMessagePersistenceResult = {
  available: boolean;
  inserted: boolean;
  shouldProcess: boolean;
  contactId?: string;
  conversationId?: string;
  messageId?: string;
};

type InboundMessageRpcRow = {
  contact_id: string;
  conversation_id: string;
  message_id: string;
  inserted: boolean;
  should_process: boolean;
};

export async function persistInboundWhatsAppMessage({
  businessId,
  connectionId,
  message,
}: {
  businessId: string;
  connectionId?: string;
  message: IncomingWhatsAppMessage;
}): Promise<InboundMessagePersistenceResult> {
  if (!isServerSupabaseConfigured()) {
    return { available: false, inserted: false, shouldProcess: false };
  }

  const rows = await supabaseServerRest<InboundMessageRpcRow[]>("/rpc/wa_ingest_inbound_message", {
    method: "POST",
    body: JSON.stringify({
      p_business_id: businessId,
      p_connection_id: connectionId ?? null,
      p_customer_phone: message.sender,
      p_meta_message_id: message.messageId,
      p_message_type: toTimelineMessageType(message.input.type),
      p_body: readableMessageBody(message),
      p_received_at: whatsappTimestamp(message.timestamp),
      p_metadata: {
        inputType: message.input.type,
        ...(message.input.latitude == null ? {} : { latitude: message.input.latitude }),
        ...(message.input.longitude == null ? {} : { longitude: message.input.longitude }),
      },
    }),
  });
  const row = rows[0];
  if (!row) throw new Error("Inbound WhatsApp persistence returned no result.");

  return {
    available: true,
    inserted: row.inserted,
    shouldProcess: row.should_process,
    contactId: row.contact_id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
  };
}

export async function finishInboundWhatsAppMessageProcessing({
  businessId,
  metaMessageId,
  succeeded,
  error,
}: {
  businessId: string;
  metaMessageId: string;
  succeeded: boolean;
  error?: unknown;
}) {
  if (!isServerSupabaseConfigured()) return undefined;

  return supabaseServerRest<string | null>("/rpc/wa_finish_inbound_message_processing", {
    method: "POST",
    body: JSON.stringify({
      p_business_id: businessId,
      p_meta_message_id: metaMessageId,
      p_succeeded: succeeded,
      p_error_message: succeeded ? null : readableError(error),
    }),
  });
}

export async function applyWhatsAppMessageStatus({
  businessId,
  status,
}: {
  businessId: string;
  status: IncomingWhatsAppStatus;
}) {
  if (!isServerSupabaseConfigured() || status.status === "unknown") return undefined;

  return supabaseServerRest<string | null>("/rpc/wa_apply_message_status", {
    method: "POST",
    body: JSON.stringify({
      p_business_id: businessId,
      p_meta_message_id: status.messageId,
      p_status: status.status.toUpperCase(),
      p_occurred_at: whatsappTimestamp(status.timestamp),
      p_error_code: status.errorCode ?? null,
      p_error_message: status.errorMessage ?? null,
    }),
  });
}

function toTimelineMessageType(inputType: IncomingWhatsAppMessage["input"]["type"]) {
  return inputType === "text" ? "TEXT" : "INTERACTIVE";
}

function readableMessageBody(message: IncomingWhatsAppMessage) {
  const value = message.input.value.trim();
  if (value) return value;
  if (message.input.type === "location") return "Shared location";
  return `Unsupported WhatsApp ${message.input.type} message`;
}

function whatsappTimestamp(value: string) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Inbound WhatsApp processing failed.";
}
