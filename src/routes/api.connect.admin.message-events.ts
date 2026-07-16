import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminMessageEventsHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/message-events")({
  server: {
    handlers: createInternalAdminMessageEventsHandlers(),
  },
});
