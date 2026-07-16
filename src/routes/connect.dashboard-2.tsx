import { createFileRoute } from "@tanstack/react-router";

import { DashboardLayout } from "./connect.dashboard";

export const Route = createFileRoute("/connect/dashboard-2")({
  component: () => (
    <DashboardLayout basePath="/connect/dashboard-2" title="Partner Bot" appearance="light" />
  ),
});
