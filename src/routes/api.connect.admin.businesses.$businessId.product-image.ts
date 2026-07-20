import { createFileRoute } from "@tanstack/react-router";

import { createInternalAdminBusinessProductImageUploadHandlers } from "@/features/connect/shared/admin-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/businesses/$businessId/product-image")({
  server: {
    handlers: createInternalAdminBusinessProductImageUploadHandlers(),
  },
});
