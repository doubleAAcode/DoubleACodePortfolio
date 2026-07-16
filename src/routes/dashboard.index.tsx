import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: location.href.replace("/dashboard", "/connect/dashboard") });
  },
});
