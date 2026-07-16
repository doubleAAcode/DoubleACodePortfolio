import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

const MESSAGE_TTL_MS = 10 * 60 * 1000;
const processedMessageIds = new Map<string, number>();

export async function hasProcessedWhatsAppMessage({
  messageId,
  businessId,
  customerPhone,
  now = Date.now(),
}: {
  messageId: string;
  businessId: string;
  customerPhone: string;
  now?: number;
}) {
  if (isServerSupabaseConfigured()) {
    return hasProcessedMessageInSupabase({ messageId, businessId, customerPhone, now });
  }

  pruneProcessedMessageIds(now);

  if (processedMessageIds.has(messageId)) {
    return true;
  }

  processedMessageIds.set(messageId, now + MESSAGE_TTL_MS);
  return false;
}

async function hasProcessedMessageInSupabase({
  messageId,
  businessId,
  customerPhone,
  now,
}: {
  messageId: string;
  businessId: string;
  customerPhone: string;
  now: number;
}) {
  try {
    await supabaseServerRest("/wa_processed_messages", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        message_id: messageId,
        business_id: businessId,
        customer_phone: customerPhone,
        expires_at: new Date(now + MESSAGE_TTL_MS).toISOString(),
      }),
    });
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("duplicate") || message.includes("unique")) return true;
    throw error;
  }
}

function pruneProcessedMessageIds(now: number) {
  for (const [messageId, expiresAt] of processedMessageIds.entries()) {
    if (expiresAt <= now) {
      processedMessageIds.delete(messageId);
    }
  }
}
