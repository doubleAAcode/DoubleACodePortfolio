import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/dashboard-2/simulator")({
  beforeLoad: () => {
    throw redirect({ href: "/connect/client/automations" });
  },
});
