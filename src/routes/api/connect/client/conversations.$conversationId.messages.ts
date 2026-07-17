import { createFileRoute } from "@tanstack/react-router";

import { createClientHumanTextReplyHandlers } from "@/features/connect/shared/human-operations-api-handlers.server";

export const Route = createFileRoute("/api/connect/client/conversations/$conversationId/messages")({
  server: {
    handlers: createClientHumanTextReplyHandlers(),
  },
});
