import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AlertCircle, Clock3, Loader2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { getInboxConversations } from "@/features/connect/flow-manager-ui/inbox-client";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import type { InboxConversationSummary } from "@/features/connect/shared/inbox-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect/admin/inbox")({
  head: () => ({ meta: [{ title: "Live Ops - WA Admin" }] }),
  component: InboxLayout,
});

type FolderKey =
  | "all"
  | "mine"
  | "unassigned"
  | "escalated"
  | "sla"
  | "flow-errors"
  | "qa"
  | "closed";

const folders: Array<{ key: FolderKey; label: string; future?: boolean }> = [
  { key: "all", label: "All active" },
  { key: "mine", label: "Mine", future: true },
  { key: "unassigned", label: "Unassigned" },
  { key: "escalated", label: "Escalated by bot", future: true },
  { key: "sla", label: "SLA breaching", future: true },
  { key: "flow-errors", label: "Flow errors", future: true },
  { key: "qa", label: "New businesses (QA)", future: true },
  { key: "closed", label: "Closed" },
];

function InboxLayout() {
  const [folder, setFolder] = useState<FolderKey>("all");
  const [q, setQ] = useState("");
  const [tagId, setTagId] = useState<string>();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const selectedFolder = folders.find((item) => item.key === folder)!;
  const detailSelected =
    pathname !== "/connect/admin/inbox" && pathname !== "/connect/admin/inbox/";

  const conversationsQuery = useInfiniteQuery({
    queryKey: ["connect", "inbox", "admin", "conversations", folder, q.trim(), tagId ?? ""],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      getInboxConversations("admin", {
        search: q.trim() || undefined,
        status: folder === "closed" ? "CLOSED" : undefined,
        assignee: folder === "unassigned" ? "unassigned" : undefined,
        tagId,
        limit: 50,
        cursor: pageParam || undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !selectedFolder.future,
    refetchInterval: 15_000,
  });

  const loadedConversations = useMemo(
    () => conversationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [conversationsQuery.data],
  );
  const conversations = useMemo(
    () =>
      folder === "all"
        ? loadedConversations.filter((conversation) => conversation.status !== "CLOSED")
        : loadedConversations,
    [folder, loadedConversations],
  );
  const tags = useMemo(() => {
    const byId = new Map<string, InboxConversationSummary["contact"]["tags"][number]>();
    loadedConversations.forEach((conversation) =>
      conversation.contact.tags.forEach((tag) => byId.set(tag.id, tag)),
    );
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [loadedConversations]);
  const metrics = useMemo(() => {
    const now = Date.now();
    return {
      active: loadedConversations.filter((item) => item.status !== "CLOSED").length,
      atRisk: loadedConversations.filter(
        (item) => item.slaDueAt && new Date(item.slaDueAt).getTime() <= now,
      ).length,
      unassigned: loadedConversations.filter((item) => !item.assignee).length,
    };
  }, [loadedConversations]);

  return (
    <>
      <div className={cn(detailSelected && "hidden md:block")}>
        <TopBar
          title="Live Ops"
          subtitle="Cross-business war room - every WhatsApp conversation your team supports."
        />
        <div className="grid grid-cols-2 gap-0 border-t divide-x md:grid-cols-4">
          <Metric label="Active loaded" value={metrics.active} />
          <Metric label="SLA at risk loaded" value={metrics.atRisk} tone="text-amber-600" />
          <Metric label="Unassigned loaded" value={metrics.unassigned} tone="text-primary" />
          <Metric label="Bot handoffs (15m)" value="--" tone="text-fuchsia-600" future />
        </div>
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-0 border-t bg-background md:min-h-[calc(100dvh-18rem)] md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[200px_320px_minmax(0,1fr)]",
          detailSelected ? "min-h-[calc(100dvh-6rem)]" : "min-h-[calc(100dvh-13rem)]",
        )}
      >
        <aside className="hidden border-r bg-muted/20 p-3 xl:block">
          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">Folders</div>
          <nav className="space-y-0.5">
            {folders.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFolder(item.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                  folder === item.key && "bg-accent font-medium",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.future ? <FutureLabel /> : null}
              </button>
            ))}
          </nav>
          <div className="mb-2 mt-4 px-2 text-xs font-medium text-muted-foreground">Tags</div>
          <div className="space-y-0.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setTagId((current) => (current === tag.id ? undefined : tag.id))}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                  tagId === tag.id && "bg-accent font-medium",
                )}
              >
                #{tag.name}
              </button>
            ))}
            {!conversationsQuery.isLoading && tags.length === 0 ? (
              <div className="px-2 py-1 text-xs text-muted-foreground">No tags in this result.</div>
            ) : null}
          </div>
        </aside>

        <aside
          className={cn(
            "min-h-0 flex-col border-r bg-background md:flex",
            detailSelected ? "hidden" : "flex",
          )}
        >
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search conversations"
                className="h-9 pl-8"
              />
            </div>
          </div>
          {selectedFolder.future ? (
            <FutureFolder label={selectedFolder.label} />
          ) : (
            <ConversationList
              conversations={conversations}
              pathname={pathname}
              loading={conversationsQuery.isLoading}
              error={conversationsQuery.error}
              hasNextPage={conversationsQuery.hasNextPage}
              fetchingNextPage={conversationsQuery.isFetchingNextPage}
              onRetry={() => void conversationsQuery.refetch()}
              onLoadMore={() => void conversationsQuery.fetchNextPage()}
            />
          )}
        </aside>

        <section
          className={cn("min-w-0 bg-background md:block", detailSelected ? "block" : "hidden")}
        >
          <Outlet />
        </section>
      </div>
    </>
  );
}

function ConversationList({
  conversations,
  pathname,
  loading,
  error,
  hasNextPage,
  fetchingNextPage,
  onRetry,
  onLoadMore,
}: {
  conversations: InboxConversationSummary[];
  pathname: string;
  loading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchingNextPage: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  if (loading)
    return (
      <ListState
        icon={<Loader2 className="size-5 animate-spin" />}
        text="Loading conversations..."
      />
    );
  if (error) {
    return (
      <ListState
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
      {conversations.map((conversation) => {
        const active = pathname === `/connect/admin/inbox/${conversation.id}`;
        const overSla = Boolean(
          conversation.slaDueAt && new Date(conversation.slaDueAt).getTime() < Date.now(),
        );
        return (
          <li key={conversation.id}>
            <Link
              to="/connect/admin/inbox/$conversationId"
              params={{ conversationId: conversation.id }}
              className={cn("block p-3 transition hover:bg-accent/50", active && "bg-accent")}
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
                    {conversation.business.name}
                  </div>
                </div>
              </div>
              <p className="mt-1.5 truncate text-sm text-muted-foreground">
                {conversation.lastMessagePreview ?? "No message preview"}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {conversation.unreadCount > 0 ? (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    {conversation.unreadCount}
                  </span>
                ) : null}
                {overSla ? (
                  <StatusBadge tone="destructive" icon={<AlertCircle className="h-3 w-3" />}>
                    SLA breached
                  </StatusBadge>
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
            </Link>
          </li>
        );
      })}
      {conversations.length === 0 ? (
        <li className="p-8 text-center text-sm text-muted-foreground">
          No conversations in this view.
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

function Metric({
  label,
  value,
  tone = "text-foreground",
  future = false,
}: {
  label: string;
  value: number | string;
  tone?: string;
  future?: boolean;
}) {
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground">
        <span>{label}</span>
        {future ? <FutureLabel /> : null}
      </div>
      <div className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}

function ListState({
  icon,
  text,
  action,
}: {
  icon: React.ReactNode;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
      {icon}
      <span>{text}</span>
      {action}
    </div>
  );
}

function FutureFolder({ label }: { label: string }) {
  return (
    <ListState
      icon={<Clock3 className="size-5 text-amber-600" />}
      text={`${label} needs its dedicated server-side operational filter. It remains visible for the next inbox iteration.`}
    />
  );
}

function FutureLabel() {
  return (
    <span className="shrink-0 rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}

function contactInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}
