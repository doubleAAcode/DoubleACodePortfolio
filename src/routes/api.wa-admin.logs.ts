import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminLogsHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/logs")({
  server: {
    handlers: createInternalAdminLogsHandlers(),
  },
});
