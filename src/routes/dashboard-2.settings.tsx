import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "./dashboard.settings";

export const Route = createFileRoute("/dashboard-2/settings")({
  component: SettingsPage,
});
