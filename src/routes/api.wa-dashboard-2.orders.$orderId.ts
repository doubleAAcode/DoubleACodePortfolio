import { createFileRoute } from "@tanstack/react-router";

import { createDashboardOrderDetailsHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard-2/orders/$orderId")({
  server: {
    handlers: createDashboardOrderDetailsHandlers("2"),
  },
});
