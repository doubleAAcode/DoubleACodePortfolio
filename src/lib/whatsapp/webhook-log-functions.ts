import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { WhatsAppWebhookLogRow } from "./webhook-log-store.server";

export type WhatsAppWebhookLogsResult =
  | { ok: true; logs: WhatsAppWebhookLogRow[] }
  | { ok: false; error: string; logs: WhatsAppWebhookLogRow[] };

export const getWhatsAppWebhookLogs = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      key: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
  )
  .handler(async ({ data }): Promise<WhatsAppWebhookLogsResult> => {
    const requiredKey = process.env.WA_BOT_LOGS_KEY;

    if (!requiredKey) {
      return {
        ok: false as const,
        error: "WA_BOT_LOGS_KEY is not configured.",
        logs: [],
      };
    }

    if (data.key !== requiredKey) {
      return {
        ok: false as const,
        error: "Unauthorized. Add ?key=YOUR_WA_BOT_LOGS_KEY to the URL.",
        logs: [],
      };
    }

    const { listWhatsAppWebhookLogs } = await import("./webhook-log-store.server");
    return listWhatsAppWebhookLogs(data.limit ?? 50);
  });
