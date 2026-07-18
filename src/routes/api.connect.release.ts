import { createFileRoute } from "@tanstack/react-router";

export const CONNECT_RELEASE = "m1d-admin-inbox-v1";

export const Route = createFileRoute("/api/connect/release")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            product: "double-a-connect",
            release: CONNECT_RELEASE,
            capabilities: ["minute-workers", "database-rollout-controls", "admin-live-operations"],
          },
          {
            headers: {
              "Cache-Control": "no-store",
              "X-Connect-Release": CONNECT_RELEASE,
            },
          },
        ),
    },
  },
});
