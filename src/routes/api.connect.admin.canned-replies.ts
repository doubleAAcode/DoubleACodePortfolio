import { createFileRoute } from "@tanstack/react-router";

import { createAdminCannedReplyCollectionHandlers } from "@/features/connect/shared/inbox-configuration-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/canned-replies")({
  server: { handlers: createAdminCannedReplyCollectionHandlers() },
});
