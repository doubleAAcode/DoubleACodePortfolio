import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Download, Loader2, Plus, RefreshCw, Search, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BulkActionBar } from "@/features/connect/flow-manager-ui/components/bulk-action-bar";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { getInboxContacts } from "@/features/connect/flow-manager-ui/inbox-client";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import type {
  InboxContactLifecycle,
  InboxContactSummary,
} from "@/features/connect/shared/inbox-query";

export const Route = createFileRoute("/connect/admin/contacts/")({
  component: ContactsList,
});

const lifecycleTone: Record<InboxContactLifecycle, "success" | "info" | "warning" | "neutral"> = {
  VIP: "success",
  CUSTOMER: "info",
  LEAD: "warning",
  CHURNED: "neutral",
};

function ContactsList() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const contactsQuery = useInfiniteQuery({
    queryKey: ["connect", "contacts", "admin", q.trim()],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      getInboxContacts("admin", {
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

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function explainFuture(feature: string, description: string) {
    toast.info(`${feature} - Future`, { description });
  }

  return (
    <>
      <TopBar
        title="Contacts"
        subtitle="Every WhatsApp contact across your businesses."
        actions={
          <>
            <Button
              data-flow-manager-live-action
              variant="outline"
              size="sm"
              onClick={() =>
                explainFuture(
                  "CSV import",
                  "Bulk contact creation and validation will be connected in a later milestone.",
                )
              }
            >
              <Upload className="h-4 w-4" />
              Import CSV <FutureLabel />
            </Button>
            <Button
              data-flow-manager-live-action
              variant="outline"
              size="sm"
              onClick={() =>
                explainFuture(
                  "Contact export",
                  "Audited tenant-safe exports are planned but do not run yet.",
                )
              }
            >
              <Download className="h-4 w-4" />
              Export <FutureLabel />
            </Button>
            <Button
              data-flow-manager-live-action
              size="sm"
              onClick={() =>
                explainFuture(
                  "New contact",
                  "Manual contact creation will be added after duplicate and consent rules are finalized.",
                )
              }
            >
              <Plus className="h-4 w-4" />
              New contact <FutureLabel />
            </Button>
          </>
        }
      />
      <div className="space-y-4 px-4 pb-10 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setSelected([]);
              }}
              placeholder="Search contacts"
              className="h-9 pl-8"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {contacts.length}
            {contactsQuery.hasNextPage ? "+" : ""} contacts
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select loaded contacts"
                    checked={contacts.length > 0 && selected.length === contacts.length}
                    onCheckedChange={(value) =>
                      setSelected(value ? contacts.map((contact) => contact.id) : [])
                    }
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">
                    Spend <FutureLabel />
                  </span>
                </TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Opt-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <ContactRows
                contacts={contacts}
                selected={selected}
                loading={contactsQuery.isLoading}
                error={contactsQuery.error}
                onToggle={toggle}
                onRetry={() => void contactsQuery.refetch()}
              />
            </TableBody>
          </Table>
        </div>

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

        <BulkActionBar
          count={selected.length}
          onClear={() => setSelected([])}
          actions={
            <>
              <FutureBulkAction
                label="Tag"
                onClick={() =>
                  explainFuture("Bulk tags", "Bulk contact tagging does not mutate records yet.")
                }
              />
              <FutureBulkAction
                label="Export"
                onClick={() =>
                  explainFuture(
                    "Bulk export",
                    "Selected-contact exports are planned for later work.",
                  )
                }
              />
              <FutureBulkAction
                label="Add to broadcast"
                onClick={() =>
                  explainFuture(
                    "Broadcast audiences",
                    "Broadcasts stay disabled until consent and template safeguards are complete.",
                  )
                }
              />
              <FutureBulkAction
                label="Delete"
                destructive
                onClick={() =>
                  explainFuture(
                    "Contact deletion",
                    "Deletion needs retention and audit rules before it can be enabled.",
                  )
                }
              />
            </>
          }
        />
      </div>
    </>
  );
}

function ContactRows({
  contacts,
  selected,
  loading,
  error,
  onToggle,
  onRetry,
}: {
  contacts: InboxContactSummary[];
  selected: string[];
  loading: boolean;
  error: Error | null;
  onToggle: (id: string) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          Loading contacts...
        </TableCell>
      </TableRow>
    );
  }
  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={9} className="h-40 text-center">
          <AlertCircle className="mx-auto mb-2 h-5 w-5 text-destructive" />
          <p className="mb-3 text-sm text-muted-foreground">{error.message}</p>
          <Button
            data-flow-manager-live-action
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </TableCell>
      </TableRow>
    );
  }
  if (contacts.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
          No WhatsApp contacts match this search.
        </TableCell>
      </TableRow>
    );
  }

  return contacts.map((contact) => (
    <TableRow key={contact.id}>
      <TableCell>
        <Checkbox
          aria-label={`Select ${contact.displayName}`}
          checked={selected.includes(contact.id)}
          onCheckedChange={() => onToggle(contact.id)}
        />
      </TableCell>
      <TableCell>
        <Link
          to="/connect/admin/contacts/$contactId"
          params={{ contactId: contact.id }}
          className="font-medium hover:underline"
        >
          {contact.displayName}
        </Link>
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground">{contact.phoneE164}</TableCell>
      <TableCell className="text-muted-foreground">{contact.business.name}</TableCell>
      <TableCell>
        <StatusBadge tone={lifecycleTone[contact.lifecycle]}>
          {contact.lifecycle.toLowerCase()}
        </StatusBadge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {contact.tags.length ? (
            contact.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No tags</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right text-muted-foreground">--</TableCell>
      <TableCell className="text-muted-foreground">
        {formatDistanceToNow(contact.lastSeenAt)}
      </TableCell>
      <TableCell>
        <OptInBadge status={contact.optInStatus} />
      </TableCell>
    </TableRow>
  ));
}

function OptInBadge({ status }: { status: InboxContactSummary["optInStatus"] }) {
  if (status === "OPTED_IN") return <StatusBadge tone="success">Yes</StatusBadge>;
  if (status === "OPTED_OUT") return <StatusBadge tone="warning">Opted out</StatusBadge>;
  return <StatusBadge tone="neutral">Unknown</StatusBadge>;
}

function FutureBulkAction({
  label,
  destructive = false,
  onClick,
}: {
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      data-flow-manager-live-action
      type="button"
      size="sm"
      variant="ghost"
      className={destructive ? "text-destructive" : undefined}
      onClick={onClick}
    >
      {label} <FutureLabel />
    </Button>
  );
}

function FutureLabel() {
  return (
    <span className="rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}
