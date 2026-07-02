import { createFileRoute } from "@tanstack/react-router";

import { DeliveryPage } from "./dashboard.delivery";

export const Route = createFileRoute("/dashboard-2/delivery")({
  component: DeliveryPage,
});
