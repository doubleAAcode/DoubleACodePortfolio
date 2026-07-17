import { createFileRoute } from "@tanstack/react-router";

import { createAdminContactDetailHandlers } from "@/features/connect/shared/inbox-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/contacts/$contactId")({
  server: { handlers: createAdminContactDetailHandlers() },
});
