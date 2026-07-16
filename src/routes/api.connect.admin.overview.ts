import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminOverviewHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/overview")({
  server: {
    handlers: createInternalAdminOverviewHandlers(),
  },
});
