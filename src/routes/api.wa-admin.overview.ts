import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminOverviewHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/overview")({
  server: {
    handlers: createInternalAdminOverviewHandlers(),
  },
});
