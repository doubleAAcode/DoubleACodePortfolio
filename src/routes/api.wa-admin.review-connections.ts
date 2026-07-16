import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminReviewConnectionsHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/review-connections")({
  server: {
    handlers: createInternalAdminReviewConnectionsHandlers(),
  },
});
