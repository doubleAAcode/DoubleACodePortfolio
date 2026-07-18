import { createFileRoute } from "@tanstack/react-router";

import { createClientCannedReplyItemHandlers } from "@/features/connect/shared/inbox-configuration-api-handlers.server";

export const Route = createFileRoute("/api/connect/client/canned-replies/$replyId")({
  server: { handlers: createClientCannedReplyItemHandlers() },
});
