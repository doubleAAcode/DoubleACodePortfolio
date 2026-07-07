import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminLoginHandlers } from "@/lib/whatsapp/admin-api-handlers.server";

export const Route = createFileRoute("/api/wa-admin/login")({
  server: {
    handlers: createInternalAdminLoginHandlers(),
  },
});
