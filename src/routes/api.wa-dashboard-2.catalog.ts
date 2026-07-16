import { createFileRoute } from "@tanstack/react-router";

import { createDashboardCatalogHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard-2/catalog")({
  server: {
    handlers: createDashboardCatalogHandlers("2"),
  },
});
