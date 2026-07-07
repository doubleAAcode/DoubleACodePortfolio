import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminBusinessFlowHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/businesses/$businessId/flow")({
  server: {
    handlers: createInternalAdminBusinessFlowHandlers(),
  },
});
