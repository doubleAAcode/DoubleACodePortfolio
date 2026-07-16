import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/products")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: location.href.replace("/dashboard", "/connect/dashboard") });
  },
});
