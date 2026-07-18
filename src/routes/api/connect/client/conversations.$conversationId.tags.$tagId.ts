import { createFileRoute } from "@tanstack/react-router";

import { createClientConversationTagHandlers } from "@/features/connect/shared/conversation-operations-api-handlers.server";

export const Route = createFileRoute(
  "/api/connect/client/conversations/$conversationId/tags/$tagId",
)({ server: { handlers: createClientConversationTagHandlers() } });
