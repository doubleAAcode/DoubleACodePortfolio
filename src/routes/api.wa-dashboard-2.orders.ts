import { createFileRoute } from "@tanstack/react-router";

import { createDashboardOrdersHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard-2/orders")({
  server: {
    handlers: createDashboardOrdersHandlers("2"),
  },
});
