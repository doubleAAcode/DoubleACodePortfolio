import { createFileRoute } from "@tanstack/react-router";

import { createDashboardLoginHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard-2/login")({
  server: {
    handlers: createDashboardLoginHandlers("2"),
  },
});
