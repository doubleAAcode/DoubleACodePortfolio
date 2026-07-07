import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminMessageEventsHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/message-events")({
  server: {
    handlers: createInternalAdminMessageEventsHandlers(),
  },
});
