import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/stores/pavone/wishlist")({
  beforeLoad: () => {
    throw redirect({ to: "/stores/pavone/shop" });
  },
});
