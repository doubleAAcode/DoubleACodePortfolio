import { createFileRoute } from "@tanstack/react-router";

import { createHumanOutboxProcessorHandlers } from "@/features/connect/shared/human-outbox-operations-api-handlers.server";

export const Route = createFileRoute("/api/connect/admin/human-outbox/process")({
  server: {
    handlers: createHumanOutboxProcessorHandlers(),
  },
});
