import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminBusinessFlowImageUploadHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/businesses/$businessId/flow-image")({
  server: {
    handlers: createInternalAdminBusinessFlowImageUploadHandlers(),
  },
});
