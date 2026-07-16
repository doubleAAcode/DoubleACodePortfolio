import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { conversations } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { Search, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect/admin/inbox")({
  head: () => ({ meta: [{ title: "Live Ops — WA Admin" }] }),
  component: InboxLayout,
});

const folders = [
  { key: "all", label: "All active" },
  { key: "mine", label: "Mine" },
  { key: "unassigned", label: "Unassigned" },
  { key: "escalated", label: "Escalated by bot" },
  { key: "sla", label: "SLA breaching" },
  { key: "flow-errors", label: "Flow errors" },
  { key: "qa", label: "New businesses (QA)" },
  { key: "closed", label: "Closed" },
];

function InboxLayout() {
  const [folder, setFolder] = useState("all");
  const [q, setQ] = useState("");
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const filtered = conversations.filter((c) => {
    if (folder === "mine" && c.assignee !== "Rania Haddad") return false;
    if (folder === "unassigned" && c.assignee) return false;
    if (folder === "sla" && (c.slaMinsLeft === null || c.slaMinsLeft > 0)) return false;
    if (folder === "closed" && c.status !== "closed") return false;
    if (folder === "all" && c.status === "closed") return false;
    if (q && !`${c.contactName} ${c.business} ${c.lastMessage}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <TopBar title="Live Ops" subtitle="Cross-business war room — every WhatsApp conversation your team supports." />
      {/* Ops metrics bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t divide-x">
        {[
          { k: "Active now", v: "184", tone: "text-foreground" },
          { k: "SLA at risk", v: "12", tone: "text-amber-600" },
          { k: "Unassigned", v: "7", tone: "text-primary" },
          { k: "Bot handoffs (15m)", v: "23", tone: "text-fuchsia-600" },
        ].map((s) => (
          <div key={s.k} className="px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.k}</div>
            <div className={cn("text-lg font-semibold tabular-nums", s.tone)}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[220px_340px_minmax(0,1fr)] gap-0 border-t min-h-[calc(100vh-12rem)]">
        {/* Folders */}
        <aside className="border-r bg-muted/20 p-3 hidden md:block">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Folders</div>
          <nav className="space-y-0.5">
            {folders.map((f) => (
              <button
                key={f.key}
                onClick={() => setFolder(f.key)}
                className={cn(
                  "w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                  folder === f.key && "bg-accent font-medium"
                )}
              >
                {f.label}
              </button>
            ))}
          </nav>
          <div className="text-xs font-medium text-muted-foreground mt-4 mb-2 px-2">Tags</div>
          <div className="space-y-0.5">
            {["VIP", "delivery", "prescription", "iPhone"].map((t) => (
              <button key={t} className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                #{t}
              </button>
            ))}
          </div>
        </aside>

        {/* Conversation list */}
        <aside className="border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" className="pl-8 h-9" />
            </div>
          </div>
          <ul className="overflow-y-auto flex-1 divide-y">
            {filtered.map((c) => {
              const active = pathname === `/connect/admin/inbox/${c.id}`;
              const overSla = c.slaMinsLeft !== null && c.slaMinsLeft < 0;
              return (
                <li key={c.id}>
                  <Link
                    to="/connect/admin/inbox/$conversationId"
                    params={{ conversationId: c.id }}
                    className={cn("block p-3 hover:bg-accent/50 transition", active && "bg-accent")}
                  >
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {c.contactInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium">{c.contactName}</div>
                          <div className="ml-auto text-[11px] text-muted-foreground shrink-0">{formatDistanceToNow(c.lastAt)}</div>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{c.business}</div>
                      </div>
                    </div>
                    <p className="mt-1.5 truncate text-sm text-muted-foreground">{c.lastMessage}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {c.unread > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                      {overSla && (
                        <StatusBadge tone="destructive" icon={<AlertCircle className="h-3 w-3" />}>
                          SLA breached
                        </StatusBadge>
                      )}
                      {c.tags.slice(0, 2).map((t) => (
                        <span key={t} className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">No conversations in this view.</li>
            )}
          </ul>
        </aside>

        {/* Detail pane */}
        <section className="min-w-0"><Outlet /></section>
      </div>
    </>
  );
}
