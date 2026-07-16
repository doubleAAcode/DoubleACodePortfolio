import { createFileRoute } from "@tanstack/react-router";

import { createDashboardLogoutHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard-2/logout")({
  server: {
    handlers: createDashboardLogoutHandlers("2"),
  },
});
