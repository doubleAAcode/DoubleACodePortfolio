import { createFileRoute } from "@tanstack/react-router";

import { createClientContactDetailHandlers } from "@/features/connect/shared/inbox-api-handlers.server";

export const Route = createFileRoute("/api/connect/client/contacts/$contactId")({
  server: { handlers: createClientContactDetailHandlers() },
});
