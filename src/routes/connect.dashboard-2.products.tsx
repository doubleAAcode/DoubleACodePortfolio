import { createFileRoute } from "@tanstack/react-router";

import { ProductsPage } from "./connect.dashboard.products";

export const Route = createFileRoute("/connect/dashboard-2/products")({
  component: ProductsPage,
});
