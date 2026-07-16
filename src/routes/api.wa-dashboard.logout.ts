import { createFileRoute } from "@tanstack/react-router";

import { createDashboardLogoutHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard/logout")({
  server: {
    handlers: createDashboardLogoutHandlers(),
  },
});
