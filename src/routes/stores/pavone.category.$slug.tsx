import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/stores/pavone/category/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/stores/pavone/shop",
      search: { category: params.slug },
    });
  },
});
