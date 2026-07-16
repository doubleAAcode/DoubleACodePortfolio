import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminFlowTemplateDetailsHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/flow-templates/$templateId")({
  server: {
    handlers: createInternalAdminFlowTemplateDetailsHandlers(),
  },
});
