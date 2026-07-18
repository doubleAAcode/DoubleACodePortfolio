import { createFileRoute } from "@tanstack/react-router";

import { createClientInboxOptionsHandlers } from "@/features/connect/shared/inbox-configuration-api-handlers.server";

export const Route = createFileRoute("/api/connect/client/inbox-options")({
  server: { handlers: createClientInboxOptionsHandlers() },
});
