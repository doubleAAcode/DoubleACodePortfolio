import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/dashboard-2")({
  beforeLoad: () => {
    throw redirect({ to: "/connect/client" });
  },
});
