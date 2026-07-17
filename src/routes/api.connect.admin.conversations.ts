import { createFileRoute } from "@tanstack/react-router";

import { createAdminConversationListHandlers } from "@/features/connect/shared/inbox-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/conversations")({
  server: { handlers: createAdminConversationListHandlers() },
});
