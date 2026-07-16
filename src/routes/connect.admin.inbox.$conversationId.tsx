import { createFileRoute, notFound } from "@tanstack/react-router";
import { conversations, cannedReplies } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Send, Paperclip, Sparkles, User, Clock, Tag, MoreHorizontal, CheckCircle2, AlertCircle,
  MessageSquareText, GitBranch, Building2, Stethoscope, Bug, Bell,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/connect/admin/inbox/$conversationId")({
  component: ConversationView,
});

function ConversationView() {
  const { conversationId } = Route.useParams();
  const conv = conversations.find((c) => c.id === conversationId);
  const [draft, setDraft] = useState("");
  if (!conv) throw notFound();

  const overSla = conv.slaMinsLeft !== null && conv.slaMinsLeft < 0;

  const send = () => {
    if (!draft.trim()) return;
    toast.success("Message sent", { description: `To ${conv.contactName}` });
    setDraft("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] h-[calc(100vh-9.5rem)]">
      <div className="flex flex-col min-w-0">
        {/* Thread header */}
        <div className="border-b p-3 flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {conv.contactInitials}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm">{conv.contactName}</div>
            <div className="text-xs text-muted-foreground">{conv.contactPhone} · {conv.business}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {overSla ? (
              <StatusBadge tone="destructive" icon={<AlertCircle className="h-3 w-3" />}>
                SLA breached
              </StatusBadge>
            ) : conv.slaMinsLeft !== null ? (
              <StatusBadge tone="warning" icon={<Clock className="h-3 w-3" />}>
                Reply in {conv.slaMinsLeft}m
              </StatusBadge>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => toast.success("Conversation assigned to you")}>
              Assign to me
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => toast("Snoozed until tomorrow 9am")}>Snooze</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("Marked as resolved")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Close conversation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("Transferred to Omar")}>Transfer</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-[hsl(var(--muted)/0.3)] p-4 space-y-3">
          {conv.messages.map((m) => (
            <div key={m.id} className={cn("flex", m.from === "customer" ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm",
                  m.from === "customer"
                    ? "bg-background"
                    : m.from === "bot"
                    ? "bg-primary/10 text-foreground"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {m.kind === "template" && (
                  <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-70">
                    <Sparkles className="h-3 w-3" /> Template
                  </div>
                )}
                <div>{m.text}</div>
                <div className="mt-1 text-[10px] opacity-60 text-right">{formatDistanceToNow(m.ts)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="border-t p-3">
          <div className="flex gap-2 mb-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm"><MessageSquareText className="h-4 w-4" />Canned</Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-2">
                <div className="text-xs font-medium text-muted-foreground px-2 pb-1">Canned replies</div>
                {cannedReplies.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setDraft(r.body)}
                    className="w-full text-left rounded p-2 text-sm hover:bg-accent"
                  >
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{r.body}</div>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm"><Sparkles className="h-4 w-4" />Template</Button>
            <Button variant="outline" size="sm"><Paperclip className="h-4 w-4" />Attach</Button>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a reply…"
              className="min-h-[68px] resize-none"
            />
            <Button onClick={send} className="self-end"><Send className="h-4 w-4" />Send</Button>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <aside className="border-l bg-muted/10 p-4 space-y-4 overflow-y-auto hidden lg:block">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Contact
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="font-medium text-sm">{conv.contactName}</div>
            <div className="text-xs text-muted-foreground">{conv.contactPhone}</div>
            <div className="mt-2 text-xs">Business: <span className="font-medium">{conv.business}</span></div>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Tags
          </div>
          <div className="flex flex-wrap gap-1">
            {conv.tags.map((t) => (
              <span key={t} className="rounded border px-2 py-0.5 text-xs">{t}</span>
            ))}
            <button className="rounded border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent">
              + Add tag
            </button>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Assigned to</div>
          <div className="text-sm">{conv.assignee ?? "Unassigned"}</div>
        </div>

        {/* Flow trace — ops-specific */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" /> Flow trace
          </div>
          <div className="rounded-md border bg-background p-3 space-y-2">
            <div className="text-xs">
              <span className="text-muted-foreground">Flow:</span>{" "}
              <Link to="/connect/admin/businesses/$id/flow-builder" params={{ id: conv.businessId }} className="font-medium hover:underline">
                Retail order journey v3
              </Link>
            </div>
            <ol className="space-y-1.5 text-xs">
              {[
                { step: "Welcome", ok: true },
                { step: "Menu — Apple", ok: true },
                { step: "Product query (fallback)", ok: false },
                { step: "Handoff to human", ok: true, current: true },
              ].map((s, i) => (
                <li key={i} className={cn(
                  "flex items-center gap-2 rounded px-2 py-1",
                  s.current ? "bg-primary/10 text-primary font-medium" : ""
                )}>
                  <span className={cn(
                    "grid h-4 w-4 place-items-center rounded-full text-[9px]",
                    s.ok ? "bg-emerald-500/20 text-emerald-700" : "bg-amber-500/20 text-amber-700"
                  )}>{i + 1}</span>
                  <span className="flex-1">{s.step}</span>
                  {!s.ok && <span className="text-amber-600 text-[10px]">fallback</span>}
                </li>
              ))}
            </ol>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              Handoff reason: <span className="font-medium text-foreground">Unmatched product keyword</span>
            </div>
          </div>
        </div>

        {/* Business context */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Business context
          </div>
          <div className="rounded-md border bg-background p-3 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium">Scale</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quality tier</span><span className="font-medium text-emerald-600">● Green · Tier 3</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Msg limit</span><span className="tabular-nums">100K / day</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">On-call</span><span className="font-medium">Rania H.</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Open incidents</span><span>0</span></div>
          </div>
        </div>

        {/* Ops actions */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Ops actions</div>
          <div className="grid gap-1.5">
            <Button variant="outline" size="sm" className="justify-start" asChild>
              <Link to="/connect/admin/businesses/$id/diagnostics" params={{ id: conv.businessId }}>
                <Stethoscope className="h-3.5 w-3.5" /> Open in Diagnostics
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="justify-start" onClick={() => toast.success("Flagged as flow bug — logged")}>
              <Bug className="h-3.5 w-3.5" /> Mark as flow bug
            </Button>
            <Button variant="outline" size="sm" className="justify-start" onClick={() => toast("Business owner notified")}>
              <Bell className="h-3.5 w-3.5" /> Notify business owner
            </Button>
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Internal notes</div>
          <Textarea placeholder="Add a note only your team can see…" className="min-h-[80px]" />
        </div>
      </aside>
    </div>
  );
}
