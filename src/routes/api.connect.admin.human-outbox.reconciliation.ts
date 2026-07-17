import { createFileRoute } from "@tanstack/react-router";

import { createAdminHumanReconciliationHandlers } from "@/features/connect/shared/human-outbox-operations-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/human-outbox/reconciliation")({
  server: {
    handlers: createAdminHumanReconciliationHandlers(),
  },
});
