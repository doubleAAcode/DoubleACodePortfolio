import { createFileRoute } from "@tanstack/react-router";

import { createConversationLifecycleProcessorHandlers } from "@/features/connect/shared/conversation-operations-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/conversations/process-lifecycle")({
  server: {
    handlers: createConversationLifecycleProcessorHandlers(),
  },
});
