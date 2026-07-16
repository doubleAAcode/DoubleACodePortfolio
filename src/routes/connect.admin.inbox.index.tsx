import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/features/connect/flow-manager-ui/components/empty-state";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/connect/admin/inbox/")({
  component: () => (
    <div className="p-8">
      <EmptyState
        icon={<Inbox className="h-5 w-5" />}
        title="Select a conversation"
        description="Pick a conversation from the list to view its full history and reply."
      />
    </div>
  ),
});
