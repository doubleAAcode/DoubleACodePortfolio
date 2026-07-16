import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminFlowTemplatesHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/flow-templates")({
  server: {
    handlers: createInternalAdminFlowTemplatesHandlers(),
  },
});
