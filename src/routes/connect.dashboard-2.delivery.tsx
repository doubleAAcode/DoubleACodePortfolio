import { createFileRoute } from "@tanstack/react-router";

import { DeliveryPage } from "./connect.dashboard.delivery";

export const Route = createFileRoute("/connect/dashboard-2/delivery")({
  component: DeliveryPage,
});
