import { createFileRoute } from "@tanstack/react-router";

import { createAdminContactListHandlers } from "@/features/connect/shared/inbox-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/contacts")({
  server: { handlers: createAdminContactListHandlers() },
});
