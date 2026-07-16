import { createFileRoute } from "@tanstack/react-router";

import { createDashboardSessionHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/connect/dashboard-2/session")({
  server: {
    handlers: createDashboardSessionHandlers("2"),
  },
});
