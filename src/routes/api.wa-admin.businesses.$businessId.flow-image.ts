import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminBusinessFlowImageUploadHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/businesses/$businessId/flow-image")({
  server: {
    handlers: createInternalAdminBusinessFlowImageUploadHandlers(),
  },
});
