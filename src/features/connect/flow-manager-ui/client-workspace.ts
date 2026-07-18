import { useQuery } from "@tanstack/react-query";

import { getInboxConversations } from "@/features/connect/flow-manager-ui/inbox-client";

export function useClientWorkspaceSummary() {
  const query = useQuery({
    queryKey: ["connect", "client", "workspace"],
    queryFn: () => getInboxConversations("client", { limit: 1 }),
    staleTime: 60_000,
  });
  const business = query.data?.items[0]?.business;
  const name = business?.name ?? "Business workspace";

  return {
    business,
    name,
    initials: workspaceInitials(name),
    loading: query.isLoading,
  };
}

function workspaceInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "B"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}
