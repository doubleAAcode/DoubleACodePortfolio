import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Bug,
  Building2,
  CheckCircle2,
  CheckCheck,
  Clock,
  GitBranch,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  Stethoscope,
  Tag,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  addInboxConversationNote,
  changeInboxConversationTag,
  createInboxIdempotencyKey,
  getInboxConversation,
  getInboxOptions,
  sendInboxTextReply,
  updateInboxConversation,
  type InboxAudience,
} from "@/features/connect/flow-manager-ui/inbox-client";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import type {
  InboxConversationPriority,
  InboxEventTimelineItem,
  InboxMessageTimelineItem,
  InboxTimelineItem,
} from "@/features/connect/shared/inbox-query";
import { cn } from "@/lib/utils";

export function InboxConversationView({
  audience,
  conversationId,
}: {
  audience: InboxAudience;
  conversationId: string;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [commandError, setCommandError] = useState("");

  const detailQuery = useQuery({
    queryKey: ["connect", "inbox", audience, "conversation", conversationId],
    queryFn: () => getInboxConversation(audience, conversationId),
    refetchInterval: 15_000,
  });
  const conversation = detailQuery.data?.conversation;
  const optionsQuery = useQuery({
    queryKey: ["connect", "inbox", audience, "options", conversation?.business.id ?? ""],
    queryFn: () => getInboxOptions(audience, conversation!.business.id),
    enabled: Boolean(conversation),
  });

  const commandMutation = useMutation({
    mutationFn: (command: { run: () => Promise<unknown>; success: string }) => command.run(),
    onMutate: () => setCommandError(""),
    onSuccess: async (_, command) => {
      toast.success(command.success);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["connect", "inbox", audience, "conversations"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["connect", "inbox", audience, "conversation", conversationId],
        }),
      ]);
    },
    onError: (error) => {
      setCommandError(error instanceof Error ? error.message : "The conversation action failed.");
    },
  });

  const timeline = useMemo(
    () => [...(detailQuery.data?.timeline.items ?? [])].reverse(),
    [detailQuery.data],
  );
  const serviceWindowOpen = Boolean(
    conversation?.lastCustomerMessageAt &&
    new Date(conversation.lastCustomerMessageAt).getTime() + 24 * 60 * 60 * 1000 > Date.now(),
  );

  async function execute(success: string, run: () => Promise<unknown>) {
    await commandMutation.mutateAsync({ success, run });
  }

  async function sendReply() {
    const body = draft.trim();
    if (!body || !conversation) return;
    try {
      await execute("WhatsApp reply sent.", () =>
        sendInboxTextReply(audience, conversation.id, body, createInboxIdempotencyKey("reply")),
      );
      setDraft("");
    } catch {
      // The shared mutation renders the sanitized server error inline.
    }
  }

  async function changeStatus(status: "OPEN" | "PENDING" | "SNOOZED" | "CLOSED") {
    if (!conversation) return;
    const snoozedUntil =
      status === "SNOOZED" ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : undefined;
    try {
      await execute(`Conversation changed to ${status.toLowerCase()}.`, () =>
        updateInboxConversation(
          audience,
          conversation.id,
          { status, ...(snoozedUntil ? { snoozedUntil } : {}) },
          createInboxIdempotencyKey(`status-${status.toLowerCase()}`),
        ),
      );
    } catch {
      // The shared mutation renders the sanitized server error inline.
    }
  }

  async function changeAssignee(assigneeUserId: string | null) {
    if (!conversation) return;
    try {
      await execute(assigneeUserId ? "Conversation assigned." : "Conversation unassigned.", () =>
        updateInboxConversation(
          audience,
          conversation.id,
          { assigneeUserId },
          createInboxIdempotencyKey(assigneeUserId ? "assign" : "unassign"),
        ),
      );
    } catch {
      // The shared mutation renders the sanitized server error inline.
    }
  }

  async function changePriority(priority: InboxConversationPriority) {
    if (!conversation) return;
    try {
      await execute(`Priority changed to ${priority.toLowerCase()}.`, () =>
        updateInboxConversation(
          audience,
          conversation.id,
          { priority },
          createInboxIdempotencyKey(`priority-${priority.toLowerCase()}`),
        ),
      );
    } catch {
      // The shared mutation renders the sanitized server error inline.
    }
  }

  async function markUnread(unread: boolean) {
    if (!conversation) return;
    try {
      await execute(unread ? "Conversation marked unread." : "Conversation marked read.", () =>
        updateInboxConversation(
          audience,
          conversation.id,
          { unread },
          createInboxIdempotencyKey(unread ? "mark-unread" : "mark-read"),
        ),
      );
    } catch {
      // The shared mutation renders the sanitized server error inline.
    }
  }

  async function addNote() {
    const body = note.trim();
    if (!body || !conversation) return;
    try {
      await execute("Internal note added.", () =>
        addInboxConversationNote(
          audience,
          conversation.id,
          body,
          createInboxIdempotencyKey("note"),
        ),
      );
      setNote("");
    } catch {
      // The shared mutation renders the sanitized server error inline.
    }
  }

  async function changeTag(tagId: string, operation: "ADD" | "REMOVE") {
    if (!conversation) return;
    try {
      await execute(operation === "ADD" ? "Tag added." : "Tag removed.", () =>
        changeInboxConversationTag(
          audience,
          conversation.id,
          tagId,
          operation,
          createInboxIdempotencyKey(`tag-${operation.toLowerCase()}`),
        ),
      );
    } catch {
      // The shared mutation renders the sanitized server error inline.
    }
  }

  if (detailQuery.isLoading) {
    return (
      <ConversationState
        icon={<Loader2 className="size-5 animate-spin" />}
        text="Loading conversation..."
      />
    );
  }
  if (detailQuery.error || !conversation) {
    return (
      <ConversationState
        icon={<AlertCircle className="size-5 text-destructive" />}
        text={detailQuery.error?.message ?? "Conversation not found."}
        action={
          <Button
            data-flow-manager-live-action
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void detailQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        }
      />
    );
  }

  const overSla = Boolean(
    conversation.slaDueAt && new Date(conversation.slaDueAt).getTime() < Date.now(),
  );
  const options = optionsQuery.data;
  const availableTags =
    options?.tags.filter(
      (option) => !conversation.contact.tags.some((tag) => tag.id === option.id),
    ) ?? [];
  const sending = commandMutation.isPending;
  const replyBlocked = conversation.status === "CLOSED" || !serviceWindowOpen;

  return (
    <div className="grid h-[calc(100dvh-6rem)] min-h-[30rem] min-w-0 grid-cols-1 bg-background md:h-[calc(100dvh-18rem)] md:min-h-[26rem] 2xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-h-0 min-w-0 flex-col bg-background">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          {audience === "admin" ? (
            <Button
              asChild
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Link to="/connect/admin/inbox" aria-label="Back to conversations">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          ) : null}
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {contactInitials(conversation.contact.displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{conversation.contact.displayName}</div>
            <div className="truncate text-xs text-muted-foreground">
              {conversation.contact.phoneE164} - {conversation.business.name}
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {overSla ? (
              <StatusBadge tone="destructive" icon={<AlertCircle className="h-3 w-3" />}>
                SLA breached
              </StatusBadge>
            ) : conversation.slaDueAt ? (
              <StatusBadge tone="warning" icon={<Clock className="h-3 w-3" />}>
                {formatSlaDue(conversation.slaDueAt)}
              </StatusBadge>
            ) : null}
            <AssigneeMenu
              disabled={sending}
              assignees={options?.assignees ?? []}
              currentAssigneeId={conversation.assignee?.id ?? null}
              onChange={changeAssignee}
            />
            <ConversationMenu
              status={conversation.status}
              priority={conversation.priority}
              unread={conversation.unreadCount > 0}
              disabled={sending}
              onStatus={changeStatus}
              onPriority={changePriority}
              onUnread={markUnread}
            />
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-[hsl(var(--muted)/0.3)] p-4">
          {timeline.map((item) => (
            <TimelineItem key={`${item.kind}-${item.id}`} item={item} />
          ))}
          {timeline.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No timeline activity yet.
            </div>
          ) : null}
        </div>

        <div className="border-t p-3">
          {commandError ? (
            <div
              role="alert"
              className="mb-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{commandError}</span>
            </div>
          ) : null}
          {replyBlocked ? (
            <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              {conversation.status === "CLOSED"
                ? "Reopen the conversation before replying."
                : "The 24-hour service window is closed. An approved WhatsApp template is required."}
            </div>
          ) : null}
          <div className="mb-2 flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  data-flow-manager-live-action
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!options?.cannedReplies.length}
                >
                  <MessageSquareText className="h-4 w-4" />
                  Canned
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-2">
                <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                  Canned replies
                </div>
                {options?.cannedReplies.map((reply) => (
                  <button
                    key={reply.id}
                    type="button"
                    onClick={() => setDraft(reply.body)}
                    className="w-full rounded p-2 text-left text-sm hover:bg-accent"
                  >
                    <div className="font-medium">{reply.title}</div>
                    <div className="line-clamp-1 text-xs text-muted-foreground">{reply.body}</div>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <FutureButton
              icon={<Sparkles className="h-4 w-4" />}
              label="Template"
              message="Approved WhatsApp template replies will open here in a later messaging package."
            />
            <FutureButton
              icon={<Paperclip className="h-4 w-4" />}
              label="Attach"
              message="Images, documents, and prerecorded audio remain visible for the media milestone."
            />
          </div>
          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a reply..."
              className="min-h-[68px] resize-none"
              disabled={replyBlocked || sending}
            />
            <Button
              data-flow-manager-live-action
              type="button"
              onClick={() => void sendReply()}
              className="self-end"
              disabled={!draft.trim() || replyBlocked || sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </div>
      </div>

      <aside className="hidden space-y-4 overflow-y-auto border-l bg-muted/10 p-4 2xl:block">
        <div>
          <PanelHeading icon={<User className="h-3.5 w-3.5" />} label="Contact" />
          <div className="rounded-md border bg-background p-3">
            <div className="text-sm font-medium">{conversation.contact.displayName}</div>
            <div className="text-xs text-muted-foreground">{conversation.contact.phoneE164}</div>
            <div className="mt-2 text-xs">
              Business: <span className="font-medium">{conversation.business.name}</span>
            </div>
            <div className="mt-1 text-xs">
              Lifecycle: <span className="font-medium">{conversation.contact.lifecycle}</span>
            </div>
          </div>
        </div>
        <div>
          <PanelHeading icon={<Tag className="h-3.5 w-3.5" />} label="Tags" />
          <div className="flex flex-wrap gap-1">
            {conversation.contact.tags.map((tag) => (
              <button
                data-flow-manager-live-action
                key={tag.id}
                type="button"
                disabled={sending}
                onClick={() => void changeTag(tag.id, "REMOVE")}
                className="flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-accent"
                title={`Remove ${tag.name}`}
              >
                {tag.name}
                <X className="size-3" />
              </button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  data-flow-manager-live-action
                  type="button"
                  disabled={sending || availableTags.length === 0}
                  className="rounded border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Add tag
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52 p-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => void changeTag(tag.id, "ADD")}
                    className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    {tag.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Assigned to</div>
          <div className="text-sm">
            {conversation.assignee?.displayName ?? conversation.assignee?.email ?? "Unassigned"}
          </div>
        </div>

        <div>
          <PanelHeading icon={<GitBranch className="h-3.5 w-3.5" />} label="Flow trace" />
          <div className="space-y-2 rounded-md border bg-background p-3 text-xs">
            <div>
              <span className="text-muted-foreground">Flow:</span>{" "}
              {conversation.businessFlowId ? (
                <Link
                  to="/connect/admin/businesses/$id/flow-builder"
                  params={{ id: conversation.business.id }}
                  className="font-medium hover:underline"
                >
                  {shortId(conversation.businessFlowId)}
                </Link>
              ) : (
                <span className="text-muted-foreground">Not linked</span>
              )}
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">{shortId(conversation.flowVersionId)}</span>
            </div>
            <div className="flex justify-between gap-2 border-t pt-2">
              <span className="text-muted-foreground">Current node</span>
              <span className="max-w-[9rem] truncate font-medium">
                {conversation.currentNodeId ?? "Not linked"}
              </span>
            </div>
          </div>
        </div>

        <FuturePanel
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Business context"
          message="Plan, quality tier, message limits, and on-call context will appear here after their operational read model is connected."
        />

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            Ops actions <FutureLabel />
          </div>
          <div className="grid gap-1.5">
            <Button variant="outline" size="sm" className="justify-start" asChild>
              <Link
                to="/connect/admin/businesses/$id/diagnostics"
                params={{ id: conversation.business.id }}
              >
                <Stethoscope className="h-3.5 w-3.5" />
                Open in Diagnostics
              </Link>
            </Button>
            <FutureButton
              icon={<Bug className="h-3.5 w-3.5" />}
              label="Mark as flow bug"
              message="This will create an auditable flow-incident record in a later diagnostics package."
              fullWidth
            />
            <FutureButton
              icon={<Bell className="h-3.5 w-3.5" />}
              label="Notify business owner"
              message="This will notify the configured owner after the notification policy is connected."
              fullWidth
            />
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Internal notes</div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a note only your team can see..."
            className="min-h-[80px]"
            disabled={sending}
          />
          <Button
            data-flow-manager-live-action
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            disabled={!note.trim() || sending}
            onClick={() => void addNote()}
          >
            Add note
          </Button>
        </div>
      </aside>
    </div>
  );
}

function AssigneeMenu({
  assignees,
  currentAssigneeId,
  disabled,
  onChange,
}: {
  assignees: Array<{ id: string; email: string; displayName: string | null }>;
  currentAssigneeId: string | null;
  disabled: boolean;
  onChange: (assigneeUserId: string | null) => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-flow-manager-live-action
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
        >
          Assign
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Assign conversation</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {assignees.map((assignee) => (
          <DropdownMenuItem
            key={assignee.id}
            disabled={assignee.id === currentAssigneeId}
            onClick={() => void onChange(assignee.id)}
          >
            {assignee.displayName ?? assignee.email}
          </DropdownMenuItem>
        ))}
        {assignees.length === 0 ? (
          <DropdownMenuItem disabled>No active business users</DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!currentAssigneeId} onClick={() => void onChange(null)}>
          Unassign
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConversationMenu({
  status,
  priority,
  unread,
  disabled,
  onStatus,
  onPriority,
  onUnread,
}: {
  status: "OPEN" | "PENDING" | "SNOOZED" | "CLOSED";
  priority: InboxConversationPriority;
  unread: boolean;
  disabled: boolean;
  onStatus: (status: "OPEN" | "PENDING" | "SNOOZED" | "CLOSED") => Promise<void>;
  onPriority: (priority: InboxConversationPriority) => Promise<void>;
  onUnread: (unread: boolean) => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-flow-manager-live-action
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          title="Conversation actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Lifecycle</DropdownMenuLabel>
        {status === "CLOSED" ? (
          <DropdownMenuItem onClick={() => void onStatus("OPEN")}>
            Reopen conversation
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              disabled={status === "PENDING"}
              onClick={() => void onStatus("PENDING")}
            >
              Mark pending
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={status === "SNOOZED"}
              onClick={() => void onStatus("SNOOZED")}
            >
              Snooze for 1 hour
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void onStatus("CLOSED")}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Close conversation
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Priority</DropdownMenuLabel>
        {(["LOW", "NORMAL", "HIGH", "URGENT"] as InboxConversationPriority[]).map((value) => (
          <DropdownMenuItem
            key={value}
            disabled={priority === value}
            onClick={() => void onPriority(value)}
          >
            {value[0]}
            {value.slice(1).toLowerCase()}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void onUnread(!unread)}>
          Mark as {unread ? "read" : "unread"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TimelineItem({ item }: { item: InboxTimelineItem }) {
  if (item.kind === "event") return <EventItem event={item} />;
  return <MessageItem message={item} />;
}

function MessageItem({ message }: { message: InboxMessageTimelineItem }) {
  const fromCustomer = message.direction === "INBOUND" || message.senderType === "CUSTOMER";
  const bot = message.senderType === "BOT";
  const failed = message.status === "FAILED";
  return (
    <div className={cn("flex", fromCustomer ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[min(75%,42rem)] rounded-lg px-3 py-2 text-sm shadow-sm",
          fromCustomer
            ? "bg-background"
            : bot
              ? "bg-primary/10 text-foreground"
              : "bg-primary text-primary-foreground",
          failed && "border border-destructive/40",
        )}
      >
        {message.messageType === "TEMPLATE" ? (
          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase opacity-70">
            <Sparkles className="h-3 w-3" />
            Template
          </div>
        ) : null}
        <div className="whitespace-pre-wrap break-words">
          {message.body ?? `[${message.messageType.toLowerCase()} message]`}
        </div>
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-65">
          <span>{formatDistanceToNow(message.createdAt)}</span>
          {!fromCustomer ? <MessageStatus status={message.status} /> : null}
        </div>
        {message.errorMessage ? (
          <div className="mt-1 text-[10px] text-destructive-foreground">{message.errorMessage}</div>
        ) : null}
      </div>
    </div>
  );
}

function EventItem({ event }: { event: InboxEventTimelineItem }) {
  const note =
    event.eventType === "NOTE_ADDED" && typeof event.payload.note === "string"
      ? event.payload.note
      : null;
  if (note) {
    return (
      <div className="mx-auto max-w-[85%] rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        <div className="font-medium">Internal note</div>
        <div className="mt-1 whitespace-pre-wrap break-words">{note}</div>
        <div className="mt-1 text-[10px] text-amber-800">
          {formatDistanceToNow(event.createdAt)}
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-[85%] items-center gap-2 text-center text-[11px] text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      <span>
        {event.eventType.replaceAll("_", " ").toLowerCase()} -{" "}
        {formatDistanceToNow(event.createdAt)}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function MessageStatus({ status }: { status: string }) {
  if (status === "READ" || status === "DELIVERED")
    return <CheckCheck className="size-3" aria-label={status.toLowerCase()} />;
  if (status === "FAILED") return <AlertCircle className="size-3" aria-label="failed" />;
  return <CheckCircle2 className="size-3" aria-label={status.toLowerCase()} />;
}

function FutureButton({
  icon,
  label,
  message,
  fullWidth = false,
}: {
  icon: React.ReactNode;
  label: string;
  message: string;
  fullWidth?: boolean;
}) {
  return (
    <Button
      data-flow-manager-live-action
      type="button"
      variant="outline"
      size="sm"
      className={cn(fullWidth && "w-full justify-start")}
      onClick={() => toast.info("Future work", { description: message })}
    >
      {icon}
      {label}
      <FutureLabel />
    </Button>
  );
}

function FuturePanel({
  icon,
  label,
  message,
}: {
  icon: React.ReactNode;
  label: string;
  message: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
        <FutureLabel />
      </div>
      <button
        data-flow-manager-live-action
        type="button"
        onClick={() => toast.info("Future work", { description: message })}
        className="w-full rounded-md border bg-background p-3 text-left text-xs text-muted-foreground hover:bg-accent"
      >
        {message}
      </button>
    </div>
  );
}

function FutureLabel() {
  return (
    <span className="ml-auto shrink-0 rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}

function PanelHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {icon}
      {label}
    </div>
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
    <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
      {icon}
      <span>{text}</span>
      {action}
    </div>
  );
}

function contactInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}

function shortId(value: string | null) {
  if (!value) return "Not linked";
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function formatSlaDue(value: string) {
  const minutes = Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 60_000));
  if (minutes < 60) return `Reply in ${minutes}m`;
  return `Reply in ${Math.ceil(minutes / 60)}h`;
}
