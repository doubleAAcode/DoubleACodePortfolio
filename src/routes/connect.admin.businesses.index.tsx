import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { Filter, Loader2, PlusCircle, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  toBusinessListItem,
  type FlowManagerBusinessListItem,
  type FlowManagerBusinessStatus,
} from "@/features/connect/admin/businesses/business-view-model";
import { BusinessStatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import {
  businesses as previewBusinesses,
  type Business as PreviewBusiness,
} from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { getAdminBusinesses } from "@/features/connect/shared/admin-client";

type StatusFilter = "all" | FlowManagerBusinessStatus;

export const Route = createFileRoute("/connect/admin/businesses/")({
  head: () => ({ meta: [{ title: "Businesses - WA Admin" }] }),
  component: BusinessesList,
});

function BusinessesList() {
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const localPreview = import.meta.env.DEV && new URLSearchParams(search).get("preview") === "1";
  const [businesses, setBusinesses] = useState<FlowManagerBusinessListItem[]>(
    localPreview ? previewBusinesses.map(toPreviewBusinessListItem) : [],
  );
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(!localPreview);
  const [loadError, setLoadError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    if (localPreview) {
      setBusinesses(previewBusinesses.map(toPreviewBusinessListItem));
      setLoading(false);
      setLoadError("");
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError("");
    getAdminBusinesses()
      .then((rows) => {
        if (active) setBusinesses(rows.map(toBusinessListItem));
      })
      .catch((error) => {
        if (!active) return;
        setBusinesses([]);
        setLoadError(error instanceof Error ? error.message : "Could not load businesses.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [localPreview, reloadVersion]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return businesses.filter((business) => {
      const matchesStatus = statusFilter === "all" || business.status === statusFilter;
      const matchesQuery =
        !query ||
        [business.name, business.owner, business.category, business.waNumber].some((value) =>
          value.toLowerCase().includes(query),
        );
      return matchesStatus && matchesQuery;
    });
  }, [businesses, q, statusFilter]);

  return (
    <>
      <TopBar
        title="Businesses"
        subtitle="All businesses managed by your team."
        actions={
          <Button type="button" title="Future work">
            <PlusCircle className="h-4 w-4" />
            New business
          </Button>
        }
      />
      <div className="space-y-4 px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="h-9 pl-8"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
                Filters
                {statusFilter === "all" ? null : (
                  <span className="grid size-4 place-items-center rounded-sm bg-primary text-[10px] text-primary-foreground">
                    1
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Business status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <DropdownMenuRadioItem value="all">All statuses</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="live">Live</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="draft">Draft in progress</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="onboarding">Onboarding</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="paused">Paused</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">WhatsApp #</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((business) => (
                  <tr key={business.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        to="/connect/admin/businesses/$id"
                        params={{ id: business.id }}
                        className="font-medium hover:underline"
                      >
                        {business.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{business.owner}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{business.category}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {business.waNumber}
                    </td>
                    <td className="px-4 py-3">
                      <BusinessStatusBadge status={business.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${business.progress}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {business.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDistanceToNow(business.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/connect/admin/businesses/$id" params={{ id: business.id }}>
                          Open
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {loading ? <BusinessTableState message="Loading businesses..." loading /> : null}
                {!loading && loadError ? (
                  <BusinessTableState
                    message={loadError}
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReloadVersion((value) => value + 1)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                      </Button>
                    }
                  />
                ) : null}
                {!loading && !loadError && filtered.length === 0 ? (
                  <BusinessTableState
                    message={
                      businesses.length === 0
                        ? "No businesses have been configured yet."
                        : `No businesses match the current search and status filter.`
                    }
                  />
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

function BusinessTableState({
  message,
  loading = false,
  action,
}: {
  message: string;
  loading?: boolean;
  action?: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={7} className="px-4 py-14 text-center text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-center gap-3">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          <span>{message}</span>
          {action}
        </div>
      </td>
    </tr>
  );
}

function toPreviewBusinessListItem(business: PreviewBusiness): FlowManagerBusinessListItem {
  return {
    id: business.id,
    name: business.name,
    owner: business.owner,
    category: business.category,
    waNumber: business.waNumber,
    status: business.status,
    progress: business.progress,
    updatedAt: business.updatedAt,
  };
}
