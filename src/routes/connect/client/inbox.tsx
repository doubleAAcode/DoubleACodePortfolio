import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Loader2, MessageCircle, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AICopilotPanel } from "@/features/connect/flow-manager-ui/components/ai-copilot-panel";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { getInboxConversations } from "@/features/connect/flow-manager-ui/inbox-client";
import { InboxConversationView } from "@/features/connect/flow-manager-ui/inbox-conversation-view";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import type { InboxConversationSummary } from "@/features/connect/shared/inbox-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect/client/inbox")({
  head: () => ({ meta: [{ title: "Inbox - Client Dashboard" }] }),
  component: ClientInbox,
});

type ClientChannelFilter = "all" | "whatsapp" | "instagram" | "messenger" | "webchat" | "email";

const channelFilters: Array<{
  key: ClientChannelFilter;
  label: string;
  future?: boolean;
}> = [
  { key: "all", label: "All" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram", future: true },
  { key: "messenger", label: "Messenger", future: true },
  { key: "webchat", label: "Webchat", future: true },
  { key: "email", label: "Email", future: true },
];

function ClientInbox() {
  const [selectedId, setSelectedId] = useState<string>();
  const [filter, setFilter] = useState<ClientChannelFilter>("all");
  const [q, setQ] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const selectedFilter = channelFilters.find((item) => item.key === filter)!;

  const conversationsQuery = useInfiniteQuery({
    queryKey: ["connect", "inbox", "client", "conversations", q.trim()],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      getInboxConversations("client", {
        search: q.trim() || undefined,
        limit: 50,
        cursor: pageParam || undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !selectedFilter.future,
    refetchInterval: 15_000,
  });

  const conversations = useMemo(
    () => conversationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [conversationsQuery.data],
  );
  const selectedConversation = conversations.find((item) => item.id === selectedId);
  const activeConversation = selectedConversation ?? conversations[0];

  function selectChannel(next: (typeof channelFilters)[number]) {
    setFilter(next.key);
    if (next.future) {
      toast.info("Future work", {
        description: `${next.label} conversations will appear here after that channel is connected.`,
      });
    }
  }

  return (
    <>
      <ClientTopBar title="Inbox" subtitle="Every WhatsApp conversation in this workspace." />
      <div className="grid h-[calc(100dvh-10.625rem)] min-h-[32rem] grid-cols-1 border-t bg-background md:h-[calc(100dvh-13.5rem)] md:min-h-[28rem] md:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_300px]">
        <aside
          className={cn(
            "min-h-0 flex-col border-r bg-background md:flex",
            mobileDetailOpen ? "hidden" : "flex",
          )}
        >
          <div className="space-y-2 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search conversations"
                className="h-9 pl-8"
              />
            </div>
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
              {channelFilters.map((item) => (
                <button
                  data-flow-manager-live-action
                  key={item.key}
                  type="button"
                  onClick={() => selectChannel(item)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition hover:bg-accent",
                    filter === item.key &&
                      !item.future &&
                      "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                    filter === item.key && item.future && "border-amber-300 bg-amber-50",
                  )}
                >
                  {item.label}
                  {item.future ? <FutureLabel /> : null}
                </button>
              ))}
            </div>
          </div>

          {selectedFilter.future ? (
            <ConversationState
              icon={<MessageCircle className="size-5 text-amber-600" />}
              text={`${selectedFilter.label} remains visible for the later channel milestone.`}
            />
          ) : (
            <ConversationList
              conversations={conversations}
              activeId={activeConversation?.id}
              loading={conversationsQuery.isLoading}
              error={conversationsQuery.error}
              hasNextPage={conversationsQuery.hasNextPage}
              fetchingNextPage={conversationsQuery.isFetchingNextPage}
              onRetry={() => void conversationsQuery.refetch()}
              onLoadMore={() => void conversationsQuery.fetchNextPage()}
              onSelect={(conversationId) => {
                setSelectedId(conversationId);
                setMobileDetailOpen(true);
              }}
            />
          )}
        </aside>

        <section
          className={cn(
            "min-h-0 min-w-0 bg-background md:block",
            mobileDetailOpen ? "block" : "hidden",
          )}
        >
          {activeConversation ? (
            <InboxConversationView
              audience="client"
              conversationId={activeConversation.id}
              embedded
              showContextPanel={false}
              onBack={() => setMobileDetailOpen(false)}
            />
          ) : conversationsQuery.isLoading ? (
            <ConversationState
              icon={<Loader2 className="size-5 animate-spin" />}
              text="Loading conversation..."
            />
          ) : (
            <ConversationState
              icon={<MessageCircle className="size-5" />}
              text="Select a WhatsApp conversation to open its timeline."
            />
          )}
        </section>

        <AICopilotPanel />
      </div>
    </>
  );
}

function ConversationList({
  conversations,
  activeId,
  loading,
  error,
  hasNextPage,
  fetchingNextPage,
  onRetry,
  onLoadMore,
  onSelect,
}: {
  conversations: InboxConversationSummary[];
  activeId?: string;
  loading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchingNextPage: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onSelect: (conversationId: string) => void;
}) {
  if (loading) {
    return (
      <ConversationState
        icon={<Loader2 className="size-5 animate-spin" />}
        text="Loading conversations..."
      />
    );
  }
  if (error) {
    return (
      <ConversationState
        icon={<AlertCircle className="size-5 text-destructive" />}
        text={error.message}
        action={
          <Button
            data-flow-manager-live-action
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <button
            data-flow-manager-live-action
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={cn(
              "block w-full p-3 text-left transition hover:bg-accent/50",
              conversation.id === activeId && "bg-accent",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {contactInitials(conversation.contact.displayName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-medium">
                    {conversation.contact.displayName}
                  </div>
                  <div className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(conversation.lastMessageAt ?? conversation.updatedAt)}
                  </div>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {conversation.contact.phoneE164}
                </div>
              </div>
            </div>
            <p className="mt-1.5 truncate text-sm text-muted-foreground">
              {conversation.lastMessagePreview ?? "No message preview"}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <WhatsAppBadge />
              {conversation.unreadCount > 0 ? (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {conversation.unreadCount}
                </span>
              ) : null}
              {conversation.contact.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </button>
        </li>
      ))}
      {conversations.length === 0 ? (
        <li className="p-8 text-center text-sm text-muted-foreground">
          No WhatsApp conversations in this workspace.
        </li>
      ) : null}
      {hasNextPage ? (
        <li className="p-3">
          <Button
            data-flow-manager-live-action
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={fetchingNextPage}
            onClick={onLoadMore}
          >
            {fetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : null}
            Load more
          </Button>
        </li>
      ) : null}
    </ul>
  );
}

function ConversationState({
  icon,
  text,
  action,
}: {
  icon: React.ReactNode;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
      {icon}
      <span>{text}</span>
      {action}
    </div>
  );
}

function WhatsAppBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
      <MessageCircle className="size-2.5" />
      WhatsApp
    </span>
  );
}

function FutureLabel() {
  return (
    <span className="rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}

function contactInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}
