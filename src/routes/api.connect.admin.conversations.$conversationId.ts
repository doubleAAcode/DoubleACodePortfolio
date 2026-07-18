import { createFileRoute } from "@tanstack/react-router";

import { createAdminConversationLifecycleHandlers } from "@/features/connect/shared/conversation-operations-api-handlers.server";
import { createAdminConversationDetailHandlers } from "@/features/connect/shared/inbox-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/conversations/$conversationId")({
  server: {
    handlers: {
      ...createAdminConversationDetailHandlers(),
      ...createAdminConversationLifecycleHandlers(),
    },
  },
});
