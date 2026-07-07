import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminWhatsAppTemplatesHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/whatsapp-templates")({
  server: {
    handlers: createInternalAdminWhatsAppTemplatesHandlers(),
  },
});
