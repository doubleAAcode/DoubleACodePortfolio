import { createFileRoute } from "@tanstack/react-router";

import { createDashboardOrdersHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/connect/dashboard/orders")({
  server: {
    handlers: createDashboardOrdersHandlers(),
  },
});
