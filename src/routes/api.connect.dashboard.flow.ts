import { createFileRoute } from "@tanstack/react-router";

import { createDashboardFlowHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/connect/dashboard/flow")({
  server: {
    handlers: createDashboardFlowHandlers(),
  },
});
