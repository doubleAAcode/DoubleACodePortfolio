import { createFileRoute } from "@tanstack/react-router";

import { SimulatorPage } from "./dashboard.simulator";

export const Route = createFileRoute("/dashboard-2/simulator")({
  component: SimulatorPage,
});
