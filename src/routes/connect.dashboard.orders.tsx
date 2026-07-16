import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/dashboard/orders")({
  beforeLoad: () => {
    throw redirect({ href: "/connect/client" });
  },
});
