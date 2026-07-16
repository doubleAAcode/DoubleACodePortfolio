import { createFileRoute } from "@tanstack/react-router";

import { createDashboardDiagnosticsHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard/diagnostics")({
  server: {
    handlers: createDashboardDiagnosticsHandlers(),
  },
});
