import { createFileRoute } from "@tanstack/react-router";

import {
  createDashboardSessionCookie,
  isDashboardAuthConfigured,
  validateDashboardCredentials,
} from "@/lib/whatsapp/dashboard-auth.server";

export const Route = createFileRoute("/api/wa-dashboard/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          username?: string;
          password?: string;
        } | null;

        if (!isDashboardAuthConfigured()) {
          return Response.json(
            {
              ok: false,
              error:
                "Dashboard auth is not configured. Add WA_DASHBOARD_PASSWORD and WA_DASHBOARD_SESSION_SECRET.",
            },
            { status: 500 },
          );
        }

        const username = body?.username?.trim() || "";
        const password = body?.password || "";

        if (!validateDashboardCredentials(username, password)) {
          return Response.json(
            { ok: false, error: "Invalid dashboard credentials." },
            { status: 401 },
          );
        }

        return Response.json(
          { ok: true },
          {
            headers: {
              "Set-Cookie": createDashboardSessionCookie(username),
            },
          },
        );
      },
    },
  },
});
