import { createFileRoute } from "@tanstack/react-router";

import { createDashboardUploadHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/connect/dashboard-2/upload")({
  server: {
    handlers: createDashboardUploadHandlers("2"),
  },
});
