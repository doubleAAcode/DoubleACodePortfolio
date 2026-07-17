import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminWhatsAppHealthHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/whatsapp-health")({
  server: {
    handlers: createInternalAdminWhatsAppHealthHandlers(),
  },
});
