import { createFileRoute } from "@tanstack/react-router";

import { createDashboardNotificationHandlers } from "@/lib/whatsapp/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard/notifications")({
  server: {
    handlers: createDashboardNotificationHandlers(),
  },
});
