import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminFlowTemplateDetailsHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/flow-templates/$templateId")({
  server: {
    handlers: createInternalAdminFlowTemplateDetailsHandlers(),
  },
});
