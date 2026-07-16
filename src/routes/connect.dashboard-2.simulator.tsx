import { createFileRoute } from "@tanstack/react-router";

import { SimulatorPage } from "./connect.dashboard.simulator";

export const Route = createFileRoute("/connect/dashboard-2/simulator")({
  component: SimulatorPage,
});
