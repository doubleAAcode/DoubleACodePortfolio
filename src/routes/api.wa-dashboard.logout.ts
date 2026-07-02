import { createFileRoute } from "@tanstack/react-router";

import { clearDashboardSessionCookie } from "@/lib/whatsapp/dashboard-auth.server";

export const Route = createFileRoute("/api/wa-dashboard/logout")({
  server: {
    handlers: {
      POST: () =>
        Response.json(
          { ok: true },
          {
            headers: {
              "Set-Cookie": clearDashboardSessionCookie(),
            },
          },
        ),
    },
  },
});
