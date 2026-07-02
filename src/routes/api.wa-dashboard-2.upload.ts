import { createFileRoute } from "@tanstack/react-router";

import { createDashboardUploadHandlers } from "@/lib/whatsapp/dashboard-api-handlers.server";

export const Route = createFileRoute("/api/wa-dashboard-2/upload")({
  server: {
    handlers: createDashboardUploadHandlers("2"),
  },
});
