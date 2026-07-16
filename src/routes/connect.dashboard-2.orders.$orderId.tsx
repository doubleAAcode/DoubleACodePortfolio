import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/dashboard-2/orders/$orderId")({
  beforeLoad: () => {
    throw redirect({ href: "/connect/client" });
  },
});
