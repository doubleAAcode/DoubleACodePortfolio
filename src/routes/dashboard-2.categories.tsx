import { createFileRoute } from "@tanstack/react-router";

import { CategoriesPage } from "./dashboard.categories";

export const Route = createFileRoute("/dashboard-2/categories")({
  component: CategoriesPage,
});
