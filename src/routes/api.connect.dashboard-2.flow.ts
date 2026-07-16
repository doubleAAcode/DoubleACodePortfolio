import { createFileRoute } from "@tanstack/react-router";

import { createDashboardFlowHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/connect/dashboard-2/flow")({
  server: {
    handlers: createDashboardFlowHandlers("2"),
  },
});
