import { createFileRoute } from "@tanstack/react-router";

import { InboxConversationView } from "@/features/connect/flow-manager-ui/inbox-conversation-view";

export const Route = createFileRoute("/connect/admin/inbox/$conversationId")({
  component: ConversationRoute,
});

function ConversationRoute() {
  const { conversationId } = Route.useParams();
  return <InboxConversationView audience="admin" conversationId={conversationId} />;
}
