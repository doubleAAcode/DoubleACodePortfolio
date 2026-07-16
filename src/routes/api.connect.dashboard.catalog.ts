import { createFileRoute } from "@tanstack/react-router";

import { createDashboardCatalogHandlers } from "@/features/connect/shared/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/connect/dashboard/catalog")({
  server: {
    handlers: createDashboardCatalogHandlers(),
  },
});
