import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminBusinessFlowHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/businesses/$businessId/flow")({
  server: {
    handlers: createInternalAdminBusinessFlowHandlers(),
  },
});
