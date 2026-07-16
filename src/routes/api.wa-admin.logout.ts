import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminLogoutHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/logout")({
  server: {
    handlers: createInternalAdminLogoutHandlers(),
  },
});
