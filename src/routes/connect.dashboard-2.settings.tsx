import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "./connect.dashboard.settings";

export const Route = createFileRoute("/connect/dashboard-2/settings")({
  component: SettingsPage,
});
