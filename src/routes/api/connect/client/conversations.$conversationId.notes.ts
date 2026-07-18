import { createFileRoute } from "@tanstack/react-router";

import { createClientConversationNoteHandlers } from "@/features/connect/shared/conversation-operations-api-handlers.server";

export const Route = createFileRoute("/api/connect/client/conversations/$conversationId/notes")({
  server: { handlers: createClientConversationNoteHandlers() },
});
