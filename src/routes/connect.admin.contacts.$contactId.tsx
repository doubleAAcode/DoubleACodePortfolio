import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ChevronLeft, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { getInboxContact } from "@/features/connect/flow-manager-ui/inbox-client";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import type {
  InboxContactSummary,
  InboxConversationStatus,
} from "@/features/connect/shared/inbox-query";

export const Route = createFileRoute("/connect/admin/contacts/$contactId")({
  component: ContactDetail,
});

const conversationTone: Record<
  InboxConversationStatus,
  "success" | "info" | "warning" | "neutral"
> = {
  OPEN: "success",
  PENDING: "warning",
  SNOOZED: "info",
  CLOSED: "neutral",
};

function ContactDetail() {
  const { contactId } = Route.useParams();
  const detailQuery = useQuery({
    queryKey: ["connect", "contacts", "admin", "detail", contactId],
    queryFn: () => getInboxContact("admin", contactId),
  });
  const detail = detailQuery.data;
  const contact = detail?.contact;

  function explainFuture(feature: string, description: string) {
    toast.info(`${feature} - Future`, { description });
  }

  return (
    <>
      <TopBar
        title={contact?.displayName ?? "Contact"}
        subtitle={contact ? `${contact.phoneE164} - ${contact.business.name}` : "WhatsApp profile"}
        breadcrumbs={
          <Link
            to="/connect/admin/contacts"
            className="inline-flex items-center gap-1 hover:underline"
          >
            <ChevronLeft className="h-3 w-3" /> Contacts
          </Link>
        }
        actions={
          <>
            <Button
              data-flow-manager-live-action
              variant="outline"
              size="sm"
              onClick={() =>
                explainFuture(
                  "Start conversation",
                  "A safe conversation-start action needs approved-template and service-window checks.",
                )
              }
            >
              Start conversation <FutureLabel />
            </Button>
            <Button
              data-flow-manager-live-action
              size="sm"
              onClick={() =>
                explainFuture(
                  "Broadcast audiences",
                  "Broadcasts remain disabled until consent and template safeguards are complete.",
                )
              }
            >
              Add to broadcast <FutureLabel />
            </Button>
          </>
        }
      />

      {detailQuery.isLoading ? (
        <DetailState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          text="Loading contact..."
        />
      ) : detailQuery.error ? (
        <DetailState
          icon={<AlertCircle className="h-5 w-5 text-destructive" />}
          text={detailQuery.error.message}
          action={
            <Button
              data-flow-manager-live-action
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void detailQuery.refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      ) : contact && detail ? (
        <div className="grid gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <ProfileField label="Lifecycle">
                  <StatusBadge tone={lifecycleTone(contact.lifecycle)}>
                    {contact.lifecycle.toLowerCase()}
                  </StatusBadge>
                </ProfileField>
                <ProfileField label="Opt-in">
                  <OptInBadge status={contact.optInStatus} />
                </ProfileField>
                <ProfileField label="Conversations">
                  {detail.conversations.items.length}
                  {detail.conversations.nextCursor ? "+" : ""}
                </ProfileField>
                <ProfileField label="Lifetime spend">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    Not connected <FutureLabel />
                  </span>
                </ProfileField>
                <ProfileField label="Last seen">
                  {formatDistanceToNow(contact.lastSeenAt)}
                </ProfileField>
                <ProfileField label="Tags">
                  <ContactTags contact={contact} />
                </ProfileField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Custom attributes</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(contact.attributes).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No custom attributes.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    {Object.entries(contact.attributes).map(([key, value]) => (
                      <div key={key} className="min-w-0">
                        <div className="text-xs text-muted-foreground">{key}</div>
                        <div className="break-words">{formatAttributeValue(value)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Conversation history</CardTitle>
              </CardHeader>
              <CardContent>
                {detail.conversations.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversations recorded.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {detail.conversations.items.map((conversation) => (
                      <li key={conversation.id} className="flex min-w-0 items-center gap-3">
                        <span className="w-20 shrink-0 text-xs text-muted-foreground">
                          {formatDistanceToNow(conversation.updatedAt)}
                        </span>
                        <Link
                          to="/connect/admin/inbox/$conversationId"
                          params={{ conversationId: conversation.id }}
                          className="min-w-0 flex-1 truncate font-medium hover:underline"
                        >
                          WhatsApp conversation
                        </Link>
                        <StatusBadge tone={conversationTone[conversation.status]}>
                          {conversation.status.toLowerCase()}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Consent log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>WhatsApp marketing</span>
                  <OptInBadge status={contact.optInStatus} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Utility templates</span>
                  <FutureLabel />
                </div>
                <div className="border-t pt-3 text-xs text-muted-foreground">
                  <div>Source: {contact.optInSource || "Not recorded"}</div>
                  <div className="mt-1">
                    {contact.optInAt
                      ? `Opted in ${formatDistanceToNow(contact.optInAt)}`
                      : contact.optOutAt
                        ? `Opted out ${formatDistanceToNow(contact.optOutAt)}`
                        : "No consent timestamp recorded"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <DetailState
          icon={<MessageCircle className="h-5 w-5" />}
          text="This contact could not be found."
        />
      )}
    </>
  );
}

function DetailState({
  icon,
  text,
  action,
}: {
  icon: ReactNode;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-64 place-items-center px-4 py-10 text-center">
      <div>
        <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
        <p className="max-w-md text-sm text-muted-foreground">{text}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

function ProfileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function ContactTags({ contact }: { contact: InboxContactSummary }) {
  if (contact.tags.length === 0) return <span className="text-muted-foreground">No tags</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {contact.tags.map((tag) => (
        <span key={tag.id} className="rounded border px-1.5 py-0.5 text-[11px]">
          {tag.name}
        </span>
      ))}
    </div>
  );
}

function OptInBadge({ status }: { status: InboxContactSummary["optInStatus"] }) {
  if (status === "OPTED_IN") return <StatusBadge tone="success">Opted in</StatusBadge>;
  if (status === "OPTED_OUT") return <StatusBadge tone="warning">Opted out</StatusBadge>;
  return <StatusBadge tone="neutral">Unknown</StatusBadge>;
}

function lifecycleTone(lifecycle: InboxContactSummary["lifecycle"]) {
  if (lifecycle === "VIP") return "success" as const;
  if (lifecycle === "CUSTOMER") return "info" as const;
  if (lifecycle === "LEAD") return "warning" as const;
  return "neutral" as const;
}

function formatAttributeValue(value: unknown) {
  if (value === null) return "None";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "Stored value";
  }
}

function FutureLabel() {
  return (
    <span className="rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}
