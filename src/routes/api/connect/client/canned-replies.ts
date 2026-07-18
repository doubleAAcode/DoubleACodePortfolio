import { createFileRoute } from "@tanstack/react-router";

import { createClientCannedReplyCollectionHandlers } from "@/features/connect/shared/inbox-configuration-api-handlers.server";

export const Route = createFileRoute("/api/connect/client/canned-replies")({
  server: { handlers: createClientCannedReplyCollectionHandlers() },
});
