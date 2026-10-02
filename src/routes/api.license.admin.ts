import { createFileRoute } from "@tanstack/react-router";

import { createLicenseAdminHandlers } from "@/features/license/handlers.server";

export const Route = createFileRoute("/api/license/admin")({
  server: { handlers: createLicenseAdminHandlers() },
});
