import { createFileRoute } from "@tanstack/react-router";

import { CategoriesPage } from "./connect.dashboard.categories";

export const Route = createFileRoute("/connect/dashboard-2/categories")({
  component: CategoriesPage,
});
