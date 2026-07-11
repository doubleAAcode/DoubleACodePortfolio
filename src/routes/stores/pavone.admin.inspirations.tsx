import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/stores/pavone/admin/inspirations")({
  beforeLoad: () => {
    throw redirect({ to: "/stores/pavone/admin" });
  },
});
