import { createFileRoute } from "@tanstack/react-router";

import { createAdminInboxOptionsHandlers } from "@/features/connect/shared/inbox-configuration-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/inbox-options")({
  server: { handlers: createAdminInboxOptionsHandlers() },
});
