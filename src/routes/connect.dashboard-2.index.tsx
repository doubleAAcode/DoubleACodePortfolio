import { createFileRoute } from "@tanstack/react-router";

import { DashboardHome } from "./connect.dashboard.index";

export const Route = createFileRoute("/connect/dashboard-2/")({
  component: DashboardHome,
});
