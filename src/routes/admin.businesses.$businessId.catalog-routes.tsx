import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/businesses/$businessId/catalog-routes")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: location.href.replace("/admin", "/connect/admin") });
  },
});
