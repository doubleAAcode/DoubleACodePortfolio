import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminBusinessesHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/businesses")({
  server: {
    handlers: createInternalAdminBusinessesHandlers(),
  },
});
