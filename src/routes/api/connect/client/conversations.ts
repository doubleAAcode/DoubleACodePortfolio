import { createFileRoute } from "@tanstack/react-router";

import { createClientConversationListHandlers } from "@/features/connect/shared/inbox-api-handlers.server";

export const Route = createFileRoute("/api/connect/client/conversations")({
  server: { handlers: createClientConversationListHandlers() },
});
