import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/connect/dashboard/products")({
  beforeLoad: () => {
    throw redirect({ href: "/connect/client/catalog" });
  },
});
