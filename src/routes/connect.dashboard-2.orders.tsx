import { createFileRoute } from "@tanstack/react-router";

import { OrdersPage } from "./connect.dashboard.orders";

export const Route = createFileRoute("/connect/dashboard-2/orders")({
  component: OrdersPage,
});
