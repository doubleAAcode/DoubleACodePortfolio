import { createFileRoute } from "@tanstack/react-router";

import { createDashboardCatalogHandlers } from "@/lib/whatsapp/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard-2/catalog")({
  server: {
    handlers: createDashboardCatalogHandlers("2"),
  },
});
