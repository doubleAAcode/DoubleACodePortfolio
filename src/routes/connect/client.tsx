import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/features/connect/flow-manager-ui/components/client-sidebar";
import { CommandPalette } from "@/features/connect/flow-manager-ui/components/command-palette";
import { ClientWorkspaceGate } from "@/features/connect/flow-manager-ui/client-auth-gate";
import { FlowManagerPreviewBoundary } from "@/features/connect/flow-manager-ui/preview-boundary";

export const Route = createFileRoute("/connect/client")({
  component: ClientLayout,
});

function ClientLayout() {
  return (
    <ClientWorkspaceGate>
      <div className="connect-flow-manager-surface min-h-svh bg-background text-foreground">
        <SidebarProvider>
          <ClientSidebar />
          <SidebarInset className="min-w-0">
            <FlowManagerPreviewBoundary>
              <Outlet />
            </FlowManagerPreviewBoundary>
          </SidebarInset>
          <CommandPalette />
        </SidebarProvider>
      </div>
    </ClientWorkspaceGate>
  );
}
