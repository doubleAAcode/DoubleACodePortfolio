import { createFileRoute } from "@tanstack/react-router";

import { createDashboardLogoutHandlers } from "@/lib/whatsapp/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard-2/logout")({
  server: {
    handlers: createDashboardLogoutHandlers("2"),
  },
});
