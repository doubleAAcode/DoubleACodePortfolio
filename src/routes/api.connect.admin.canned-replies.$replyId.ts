import { createFileRoute } from "@tanstack/react-router";

import { createAdminCannedReplyItemHandlers } from "@/features/connect/shared/inbox-configuration-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/canned-replies/$replyId")({
  server: { handlers: createAdminCannedReplyItemHandlers() },
});
