import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminBusinessesHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/businesses")({
  server: {
    handlers: createInternalAdminBusinessesHandlers(),
  },
});
