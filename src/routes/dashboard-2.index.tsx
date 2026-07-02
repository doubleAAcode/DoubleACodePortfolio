import { createFileRoute } from "@tanstack/react-router";

import { DashboardHome } from "./dashboard.index";

export const Route = createFileRoute("/dashboard-2/")({
  component: DashboardHome,
});
