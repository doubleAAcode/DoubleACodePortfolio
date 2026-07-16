import { createFileRoute } from "@tanstack/react-router";

import { createDashboardLoginHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/connect/dashboard/login")({
  server: {
    handlers: createDashboardLoginHandlers(),
  },
});
