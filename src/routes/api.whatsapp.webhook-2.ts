import { createFileRoute } from "@tanstack/react-router";
import process from "node:process";

import { createWhatsAppWebhookHandlers } from "@/features/connect/shared/webhook-handler.server";

const DEFAULT_SECOND_WHATSAPP_BUSINESS_ID = "double-a-partner-test-business";

export const Route = createFileRoute("/api/whatsapp/webhook-2")({
  server: {
    handlers: createWhatsAppWebhookHandlers({
      businessId: process.env.WHATSAPP_BUSINESS_ID_2 || DEFAULT_SECOND_WHATSAPP_BUSINESS_ID,
      configSuffix: "2",
      logLabel: "whatsapp:webhook-2",
    }),
  },
});
