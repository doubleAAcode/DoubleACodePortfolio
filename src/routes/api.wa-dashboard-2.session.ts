import { createFileRoute } from "@tanstack/react-router";

import { createDashboardSessionHandlers } from "@/lib/whatsapp/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard-2/session")({
  server: {
    handlers: createDashboardSessionHandlers("2"),
  },
});
