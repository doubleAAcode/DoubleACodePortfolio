import { createFileRoute } from "@tanstack/react-router";

import { createDashboardNotificationHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/connect/dashboard/notifications")({
  server: {
    handlers: createDashboardNotificationHandlers(),
  },
});
