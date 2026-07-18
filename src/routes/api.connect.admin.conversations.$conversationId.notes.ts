import { createFileRoute } from "@tanstack/react-router";

import { createAdminConversationNoteHandlers } from "@/features/connect/shared/conversation-operations-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/conversations/$conversationId/notes")({
  server: { handlers: createAdminConversationNoteHandlers() },
});
