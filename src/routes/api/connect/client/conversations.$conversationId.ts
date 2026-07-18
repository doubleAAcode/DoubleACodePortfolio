import { createFileRoute } from "@tanstack/react-router";

import { createClientConversationLifecycleHandlers } from "@/features/connect/shared/conversation-operations-api-handlers.server";
import { createClientConversationDetailHandlers } from "@/features/connect/shared/inbox-api-handlers.server";

export const Route = createFileRoute("/api/connect/client/conversations/$conversationId")({
  server: {
    handlers: {
      ...createClientConversationDetailHandlers(),
      ...createClientConversationLifecycleHandlers(),
    },
  },
});
