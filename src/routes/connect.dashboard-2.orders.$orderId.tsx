import { createFileRoute } from "@tanstack/react-router";

import { OrderDetailsPage } from "./connect.dashboard.orders.$orderId";

export const Route = createFileRoute("/connect/dashboard-2/orders/$orderId")({
  component: DashboardPartnerOrderDetailsRoute,
});

function DashboardPartnerOrderDetailsRoute() {
  const { orderId } = Route.useParams();
  return <OrderDetailsPage orderId={orderId} />;
}
