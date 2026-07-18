import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { EmptyState } from "@/features/connect/flow-manager-ui/components/empty-state";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { getInboxContacts } from "@/features/connect/flow-manager-ui/inbox-client";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import type { InboxContactSummary } from "@/features/connect/shared/inbox-query";

export const Route = createFileRoute("/connect/client/contacts")({
  head: () => ({ meta: [{ title: "Contacts - Client Dashboard" }] }),
  component: ClientContacts,
});

function ClientContacts() {
  const [q, setQ] = useState("");
  const contactsQuery = useInfiniteQuery({
    queryKey: ["connect", "contacts", "client", q.trim()],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      getInboxContacts("client", {
        search: q.trim() || undefined,
        limit: 50,
        cursor: pageParam || undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const contacts = useMemo(
    () => contactsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [contactsQuery.data],
  );

  function explainFuture(feature: string, description: string) {
    toast.info(`${feature} - Future`, { description });
  }

  return (
    <>
      <ClientTopBar
        title="Contacts"
        subtitle="Everyone who has messaged this business on WhatsApp."
        actions={
          <>
            <Button
              data-flow-manager-live-action
              variant="outline"
              aria-label="Export contacts - Future"
              onClick={() =>
                explainFuture(
                  "Contact export",
                  "Audited tenant-safe exports are planned but do not run yet.",
                )
              }
            >
              <Download className="h-4 w-4" />
              <span className="hidden lg:inline">Export</span> <FutureLabel />
            </Button>
            <Button
              data-flow-manager-live-action
              variant="outline"
              aria-label="Import contacts - Future"
              onClick={() =>
                explainFuture(
                  "CSV import",
                  "Bulk contact creation and validation will be connected in a later milestone.",
                )
              }
            >
              <Upload className="h-4 w-4" />
              <span className="hidden lg:inline">Import CSV</span> <FutureLabel />
            </Button>
            <Button
              data-flow-manager-live-action
              aria-label="Add contact - Future"
              onClick={() =>
                explainFuture(
                  "Add contact",
                  "Manual creation will be enabled after duplicate and consent rules are finalized.",
                )
              }
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">Add contact</span> <FutureLabel />
            </Button>
          </>
        }
      />
      <div className="space-y-4 px-4 pb-10 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search by name or phone"
              className="pl-8"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {contacts.length}
            {contactsQuery.hasNextPage ? "+" : ""} contacts
          </span>
        </div>

        {contactsQuery.isLoading ? (
          <ContactState
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            text="Loading contacts..."
          />
        ) : contactsQuery.error ? (
          <ContactState
            icon={<AlertCircle className="h-5 w-5 text-destructive" />}
            text={contactsQuery.error.message}
            action={
              <Button
                data-flow-manager-live-action
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void contactsQuery.refetch()}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            }
          />
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No contacts found"
            description={
              q.trim()
                ? "No WhatsApp contacts match this search."
                : "Contacts appear here after someone messages this business on WhatsApp."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-md border bg-background">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Phone</th>
                  <th className="p-3 text-left font-medium">Lifecycle</th>
                  <th className="p-3 text-left font-medium">Tags</th>
                  <th className="p-3 text-left font-medium">Channels</th>
                  <th className="p-3 text-left font-medium">Consent</th>
                  <th className="p-3 text-left font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contacts.map((contact) => (
                  <ContactRow key={contact.id} contact={contact} onFuture={explainFuture} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {contactsQuery.hasNextPage ? (
          <div className="flex justify-center">
            <Button
              data-flow-manager-live-action
              type="button"
              variant="outline"
              size="sm"
              disabled={contactsQuery.isFetchingNextPage}
              onClick={() => void contactsQuery.fetchNextPage()}
            >
              {contactsQuery.isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Load more
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function ContactRow({
  contact,
  onFuture,
}: {
  contact: InboxContactSummary;
  onFuture: (feature: string, description: string) => void;
}) {
  return (
    <tr className="hover:bg-accent/30">
      <td className="p-3 font-medium">{contact.displayName}</td>
      <td className="p-3 tabular-nums text-muted-foreground">{contact.phoneE164}</td>
      <td className="p-3">
        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">
          {contact.lifecycle.toLowerCase()}
        </span>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-1">
          {contact.tags.length ? (
            contact.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="rounded border px-1.5 py-0.5 text-[10px]">
                {tag.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No tags</span>
          )}
        </div>
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>WhatsApp</span>
          <button
            data-flow-manager-live-action
            type="button"
            className="inline-flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              onFuture(
                "Instagram contacts",
                "Instagram remains visible for a later channel milestone and is not connected.",
              )
            }
          >
            Instagram <FutureLabel />
          </button>
        </div>
      </td>
      <td className="p-3">
        <OptInBadge status={contact.optInStatus} />
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        {formatDistanceToNow(contact.lastSeenAt)}
      </td>
    </tr>
  );
}

function ContactState({
  icon,
  text,
  action,
}: {
  icon: ReactNode;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-48 place-items-center rounded-md border bg-background p-6 text-center">
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

function OptInBadge({ status }: { status: InboxContactSummary["optInStatus"] }) {
  if (status === "OPTED_IN") return <StatusBadge tone="success">Opted in</StatusBadge>;
  if (status === "OPTED_OUT") return <StatusBadge tone="warning">Opted out</StatusBadge>;
  return <StatusBadge tone="neutral">Unknown</StatusBadge>;
}

function FutureLabel() {
  return (
    <span className="rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}
