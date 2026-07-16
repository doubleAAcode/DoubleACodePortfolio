import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminLogsHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/logs")({
  server: {
    handlers: createInternalAdminLogsHandlers(),
  },
});
