import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminReviewConnectionsHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/review-connections")({
  server: {
    handlers: createInternalAdminReviewConnectionsHandlers(),
  },
});
