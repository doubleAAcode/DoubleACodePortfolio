import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/dashboard/settings")({
  beforeLoad: () => {
    throw redirect({ href: "/connect/client/settings" });
  },
});
