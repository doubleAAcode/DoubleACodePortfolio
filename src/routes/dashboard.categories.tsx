import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/categories")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: location.href.replace("/dashboard", "/connect/dashboard") });
  },
});
