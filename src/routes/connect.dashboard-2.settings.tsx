import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/dashboard-2/settings")({
  beforeLoad: () => {
    throw redirect({ href: "/connect/client/settings" });
  },
});
