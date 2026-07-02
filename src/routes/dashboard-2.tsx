import { createFileRoute } from "@tanstack/react-router";

import { DashboardLayout } from "./dashboard";

export const Route = createFileRoute("/dashboard-2")({
  component: () => <DashboardLayout basePath="/dashboard-2" title="Partner Bot" />,
});
