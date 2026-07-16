import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminSessionHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/session")({
  server: {
    handlers: createInternalAdminSessionHandlers(),
  },
});
