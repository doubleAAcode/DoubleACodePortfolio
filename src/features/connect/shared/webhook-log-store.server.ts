import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

export type WhatsAppWebhookLogRow = {
  id: string;
  created_at: string;
  method: string;
  path: string;
  query: Record<string, string>;
  status: number;
  source: string;
  host: string | null;
  user_agent: string | null;
  message_count: number;
  duplicate_count: number;
  message_ids: string[];
  sender_mask: string | null;
  phone_number_id: string | null;
  connection_id: string | null;
  business_id: string | null;
  input_types: string[];
  result: string;
  error_summary: string | null;
};

export type WhatsAppWebhookLogInput = {
  method: string;
  url: string;
  headers: Headers;
  status: number;
  messageCount?: number;
  duplicateCount?: number;
  messageIds?: string[];
  senderMask?: string;
  phoneNumberId?: string;
  connectionId?: string;
  businessId?: string;
  inputTypes?: string[];
  result: string;
  errorSummary?: string;
};

const MAX_LOGS = 100;

export async function recordWhatsAppWebhookLog(input: WhatsAppWebhookLogInput) {
  if (!isServerSupabaseConfigured()) return;

  const url = new URL(input.url);
  const query = sanitizeQuery(url.searchParams);

  try {
    await supabaseServerRest<WhatsAppWebhookLogRow[]>("/wa_webhook_logs", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        method: input.method,
        path: url.pathname,
        query,
        status: input.status,
        host: input.headers.get("host"),
        user_agent: input.headers.get("user-agent"),
        message_count: input.messageCount ?? 0,
        duplicate_count: input.duplicateCount ?? 0,
        message_ids: input.messageIds?.slice(0, 20) ?? [],
        sender_mask: input.senderMask ?? null,
        phone_number_id: input.phoneNumberId ?? null,
        connection_id: input.connectionId ?? null,
        business_id: input.businessId ?? null,
        input_types: input.inputTypes?.slice(0, 20) ?? [],
        result: input.result,
        error_summary: input.errorSummary ?? null,
      }),
    });
  } catch (error) {
    console.error("[whatsapp:webhook-log] insert failed", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function listWhatsAppWebhookLogs(limit = MAX_LOGS) {
  if (!isServerSupabaseConfigured()) {
    return {
      ok: false as const,
      error: "Missing SUPABASE_SERVICE_ROLE_KEY or Supabase URL.",
      logs: [] as WhatsAppWebhookLogRow[],
    };
  }

  try {
    const safeLimit = Math.min(Math.max(limit, 1), MAX_LOGS);
    const logs = await supabaseServerRest<WhatsAppWebhookLogRow[]>(
      `/wa_webhook_logs?select=*&order=created_at.desc&limit=${safeLimit}`,
    );

    return { ok: true as const, logs };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not load webhook logs.",
      logs: [] as WhatsAppWebhookLogRow[],
    };
  }
}

function sanitizeQuery(searchParams: URLSearchParams) {
  const query: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    if (key === "hub.verify_token") {
      query[key] = value ? "[redacted]" : "";
    } else if (key === "hub.challenge") {
      query[key] = value ? "[present]" : "";
    } else {
      query[key] = value;
    }
  }

  return query;
}
