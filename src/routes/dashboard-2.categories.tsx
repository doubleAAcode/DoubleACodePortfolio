import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard-2/categories")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: location.href.replace("/dashboard-2", "/connect/dashboard-2") });
  },
});
