import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/dashboard/simulator")({
  beforeLoad: () => {
    throw redirect({ href: "/connect/client/automations" });
  },
});
