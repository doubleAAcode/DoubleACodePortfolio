import { createFileRoute } from "@tanstack/react-router";
import process from "node:process";

import { DOUBLE_A_TEST_BUSINESS_ID } from "@/features/connect/shared/catalog-repository.server";
import { createWhatsAppWebhookHandlers } from "@/features/connect/shared/webhook-handler.server";

export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: createWhatsAppWebhookHandlers({
      businessId: process.env.WHATSAPP_BUSINESS_ID || DOUBLE_A_TEST_BUSINESS_ID,
      logLabel: "whatsapp:webhook",
    }),
  },
});
