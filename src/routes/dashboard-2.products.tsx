import { createFileRoute } from "@tanstack/react-router";

import { ProductsPage } from "./dashboard.products";

export const Route = createFileRoute("/dashboard-2/products")({
  component: ProductsPage,
});
