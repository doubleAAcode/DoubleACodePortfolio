import { createFileRoute } from "@tanstack/react-router";

import { getDashboardSessionFromRequest } from "@/lib/whatsapp/dashboard-auth.server";
import { uploadWaProductImage } from "@/lib/whatsapp/dashboard-store.server";

export const Route = createFileRoute("/api/wa-dashboard/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = getDashboardSessionFromRequest(request);
        if (!session) {
          return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
        }
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
          return Response.json({ ok: false, error: "Choose an image to upload." }, { status: 400 });
        }

        const image = await uploadWaProductImage(file, session.businessId);
        return Response.json({ ok: true, image });
      },
    },
  },
});
