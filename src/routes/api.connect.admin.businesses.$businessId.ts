import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminBusinessDetailsHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/businesses/$businessId")({
  server: {
    handlers: createInternalAdminBusinessDetailsHandlers(),
  },
});
