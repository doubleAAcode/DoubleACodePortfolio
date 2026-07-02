import { createFileRoute } from "@tanstack/react-router";

import { getDashboardSessionFromRequest } from "@/lib/whatsapp/dashboard-auth.server";
import {
  applyWaDashboardAction,
  getWaDashboardData,
  type DashboardCatalogAction,
} from "@/lib/whatsapp/dashboard-store.server";

export const Route = createFileRoute("/api/wa-dashboard/catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = getDashboardSessionFromRequest(request);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }
        const data = await getWaDashboardData(session.businessId);

        return Response.json({ ok: true, data });
      },
      POST: async ({ request }) => {
        const session = getDashboardSessionFromRequest(request);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }
        const action = (await request.json()) as DashboardCatalogAction;
        const data = await applyWaDashboardAction(session.businessId, action);

        return Response.json({ ok: true, data });
      },
    },
  },
});
