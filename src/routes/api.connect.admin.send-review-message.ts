import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminSendReviewMessageHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/send-review-message")({
  server: {
    handlers: createInternalAdminSendReviewMessageHandlers(),
  },
});
