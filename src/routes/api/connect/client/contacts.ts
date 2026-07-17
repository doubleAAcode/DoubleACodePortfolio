import { createFileRoute } from "@tanstack/react-router";

import { createClientContactListHandlers } from "@/features/connect/shared/inbox-api-handlers.server";

export const Route = createFileRoute("/api/connect/client/contacts")({
  server: { handlers: createClientContactListHandlers() },
});
