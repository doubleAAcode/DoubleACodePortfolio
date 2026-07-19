import { createFileRoute } from "@tanstack/react-router";

import { createDashboardFlowImageUploadHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/connect/dashboard/flow-image")({
  server: {
    handlers: createDashboardFlowImageUploadHandlers(),
  },
});
