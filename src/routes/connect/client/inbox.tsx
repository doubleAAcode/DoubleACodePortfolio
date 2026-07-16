import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { multiChannelConversations, type Channel } from "@/features/connect/flow-manager-ui/preview-data/mock-client";
import { ChannelBadge } from "@/features/connect/flow-manager-ui/components/channel-badge";
import { AICopilotPanel } from "@/features/connect/flow-manager-ui/components/ai-copilot-panel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Search, Send, Paperclip, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { cn } from "@/lib/utils";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";

export const Route = createFileRoute("/connect/client/inbox")({
  head: () => ({ meta: [{ title: "Inbox — Client Dashboard" }] }),
  component: ClientInbox,
});

const channelFilters: { key: Channel | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "messenger", label: "Messenger" },
  { key: "webchat", label: "Webchat" },
  { key: "email", label: "Email" },
];

function ClientInbox() {
  const [selectedId, setSelectedId] = useState(multiChannelConversations[0].id);
  const [filter, setFilter] = useState<Channel | "all">("all");
  const [draft, setDraft] = useState("");
  const conv = multiChannelConversations.find(c => c.id === selectedId)!;
  const list = multiChannelConversations.filter(c => filter === "all" || c.channel === filter);

  const send = () => {
    if (!draft.trim()) return;
    toast.success(`Reply sent via ${conv.channel}`);
    setDraft("");
  };

  return (
    <>
      <ClientTopBar title="Inbox" subtitle="Unified across every channel." />
      <div className="grid grid-cols-1 md:grid-cols-[360px_minmax(0,1fr)_auto] border-t min-h-[calc(100vh-9.5rem)]">
        {/* Conversation list */}
        <aside className="border-r flex flex-col">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conversations" className="pl-8 h-9" />
            </div>
            <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
              {channelFilters.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs border transition",
                    filter === f.key ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="overflow-y-auto flex-1 divide-y">
            {list.map(c => {
              const active = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={cn("w-full text-left block p-3 hover:bg-accent/50 transition", active && "bg-accent")}
                  >
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {c.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium">{c.contactName}</div>
                          <div className="ml-auto text-[11px] text-muted-foreground shrink-0">{formatDistanceToNow(c.lastAt)}</div>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{c.contactHandle}</div>
                      </div>
                    </div>
                    <p className="mt-1.5 truncate text-sm text-muted-foreground">{c.lastMessage}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <ChannelBadge channel={c.channel} size="xs" showLabel={false} />
                      {c.unread > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                      {c.tags.slice(0, 2).map(t => (
                        <span key={t} className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Thread */}
        <section className="flex flex-col min-w-0">
          <div className="border-b p-3 flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {conv.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">{conv.contactName}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <ChannelBadge channel={conv.channel} size="xs" />
                {conv.contactHandle}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.success("Assigned to you")}>Assign to me</Button>
          </div>
          <div className="flex-1 overflow-y-auto bg-[hsl(var(--muted)/0.3)] p-4 space-y-3">
            {conv.messages.map(m => (
              <div key={m.id} className={cn("flex", m.from === "customer" ? "justify-start" : "justify-end")}>
                <div className={cn(
                  "max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm",
                  m.from === "customer" ? "bg-background" :
                  m.from === "ai" ? "bg-fuchsia-500/10 text-foreground border border-fuchsia-500/20" :
                  "bg-primary text-primary-foreground"
                )}>
                  {m.from === "ai" && (
                    <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-70">
                      <Sparkles className="h-3 w-3" /> AI Agent
                    </div>
                  )}
                  <div>{m.text}</div>
                  <div className="mt-1 text-[10px] opacity-60 text-right">{formatDistanceToNow(m.ts)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-3">
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm"><Sparkles className="h-4 w-4" />Template</Button>
              <Button variant="outline" size="sm"><Paperclip className="h-4 w-4" />Attach</Button>
            </div>
            <div className="flex gap-2">
              <Textarea
                value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder={`Reply via ${conv.channel}…`} className="min-h-[68px] resize-none"
              />
              <Button onClick={send} className="self-end"><Send className="h-4 w-4" />Send</Button>
            </div>
          </div>
        </section>

        <AICopilotPanel onInsert={(t) => setDraft(t)} />
      </div>
    </>
  );
}
