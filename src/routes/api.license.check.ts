import { createFileRoute } from "@tanstack/react-router";

import { createLicenseCheckHandlers } from "@/features/license/handlers.server";

export const Route = createFileRoute("/api/license/check")({
  server: { handlers: createLicenseCheckHandlers() },
});
