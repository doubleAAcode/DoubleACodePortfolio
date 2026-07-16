import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/dashboard-2/categories")({
  beforeLoad: () => {
    throw redirect({ href: "/connect/client/catalog" });
  },
});
