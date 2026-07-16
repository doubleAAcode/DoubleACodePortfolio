import { createFileRoute, Outlet } from "@tanstack/react-router";

import { ClientWorkspaceGate } from "@/features/connect/shell/client-workspace-gate";

export const Route = createFileRoute("/connect/client")({
  component: ClientWorkspaceLayout,
});

function ClientWorkspaceLayout() {
  return (
    <ClientWorkspaceGate>
      <Outlet />
    </ClientWorkspaceGate>
  );
}
