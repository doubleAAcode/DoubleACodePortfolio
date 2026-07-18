import { createFileRoute } from "@tanstack/react-router";

import { createAdminConversationTagHandlers } from "@/features/connect/shared/conversation-operations-api-handlers.server";

export const Route = createFileRoute(
  "/api/connect/admin/conversations/$conversationId/tags/$tagId",
)({ server: { handlers: createAdminConversationTagHandlers() } });
