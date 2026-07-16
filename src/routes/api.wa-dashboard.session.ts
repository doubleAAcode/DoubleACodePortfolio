import { createFileRoute } from "@tanstack/react-router";

import { createDashboardSessionHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard/session")({
  server: {
    handlers: createDashboardSessionHandlers(),
  },
});
