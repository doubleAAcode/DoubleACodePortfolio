import { createFileRoute } from "@tanstack/react-router";

import { createDashboardLoginHandlers } from "@/lib/whatsapp/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard-2/login")({
  server: {
    handlers: createDashboardLoginHandlers("2"),
  },
});
