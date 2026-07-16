import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminWhatsAppTemplatesHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/whatsapp-templates")({
  server: {
    handlers: createInternalAdminWhatsAppTemplatesHandlers(),
  },
});
