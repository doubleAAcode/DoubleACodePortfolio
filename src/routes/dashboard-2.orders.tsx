import { createFileRoute } from "@tanstack/react-router";

import { OrdersPage } from "./dashboard.orders";

export const Route = createFileRoute("/dashboard-2/orders")({
  component: OrdersPage,
});
