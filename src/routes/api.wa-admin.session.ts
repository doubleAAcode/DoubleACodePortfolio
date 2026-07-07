import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminSessionHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/session")({
  server: {
    handlers: createInternalAdminSessionHandlers(),
  },
});
