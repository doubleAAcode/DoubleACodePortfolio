import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: location.href.replace("/dashboard", "/connect/dashboard") });
  },
});
