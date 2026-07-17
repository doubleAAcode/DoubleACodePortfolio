import { createFileRoute } from "@tanstack/react-router";

import { createAdminHumanTextReplyHandlers } from "@/features/connect/shared/human-operations-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/conversations/$conversationId/messages")({
  server: {
    handlers: createAdminHumanTextReplyHandlers(),
  },
});
