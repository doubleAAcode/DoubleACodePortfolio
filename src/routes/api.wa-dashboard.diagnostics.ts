import { createFileRoute } from "@tanstack/react-router";

import { createDashboardDiagnosticsHandlers } from "@/lib/whatsapp/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard/diagnostics")({
  server: {
    handlers: createDashboardDiagnosticsHandlers(),
  },
});
