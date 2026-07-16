import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminLoginHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/login")({
  server: {
    handlers: createInternalAdminLoginHandlers(),
  },
});
