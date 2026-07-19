import { createFileRoute } from "@tanstack/react-router";

import { createDashboardFlowImageUploadHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/connect/dashboard-2/flow-image")({
  server: {
    handlers: createDashboardFlowImageUploadHandlers("2"),
  },
});
