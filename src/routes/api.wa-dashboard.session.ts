import { createFileRoute } from "@tanstack/react-router";

import {
  getDashboardSessionFromRequest,
  isDashboardAuthConfigured,
} from "@/lib/whatsapp/dashboard-auth.server";

export const Route = createFileRoute("/api/wa-dashboard/session")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const session = getDashboardSessionFromRequest(request);

        return Response.json({
          ok: true,
          configured: isDashboardAuthConfigured(),
          authenticated: Boolean(session),
          session,
        });
      },
    },
  },
});
