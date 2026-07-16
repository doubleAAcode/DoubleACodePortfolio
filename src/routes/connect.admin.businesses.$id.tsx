import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MessageCircle, Workflow } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BusinessDetailsContext } from "@/features/connect/admin/businesses/business-details-context";
import {
  toBusinessHeader,
  type FlowManagerBusinessHeader,
} from "@/features/connect/admin/businesses/business-view-model";
import { BusinessStatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  getBusiness,
  type Business as PreviewBusiness,
} from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import {
  getAdminBusinessDetails,
  type AdminBusinessDetailsResult,
} from "@/features/connect/shared/admin-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect/admin/businesses/$id")({
  component: BusinessLayout,
});

const subnav = (id: string) => [
  { to: `/connect/admin/businesses/${id}`, label: "Setup Hub", exact: true },
  { to: `/connect/admin/businesses/${id}/whatsapp`, label: "WhatsApp Connection" },
  { to: `/connect/admin/businesses/${id}/catalog-routes`, label: "Catalog Routes" },
  { to: `/connect/admin/businesses/${id}/route-values`, label: "Route Values" },
  { to: `/connect/admin/businesses/${id}/products`, label: "Products" },
  { to: `/connect/admin/businesses/${id}/checkout`, label: "Checkout Settings" },
  { to: `/connect/admin/businesses/${id}/flow-builder`, label: "Flow Builder" },
  { to: `/connect/admin/businesses/${id}/live-test`, label: "Live Test" },
  { to: `/connect/admin/businesses/${id}/diagnostics`, label: "Diagnostics" },
];

function BusinessLayout() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const localPreview = import.meta.env.DEV && new URLSearchParams(search).get("preview") === "1";
  const [details, setDetails] = useState<AdminBusinessDetailsResult | null>(null);
  const [loading, setLoading] = useState(!localPreview);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (localPreview) {
      setDetails(null);
      setLoading(false);
      setLoadError("");
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError("");
    getAdminBusinessDetails(id)
      .then((result) => {
        if (active) setDetails(result);
      })
      .catch((error) => {
        if (!active) return;
        setDetails(null);
        setLoadError(error instanceof Error ? error.message : "Could not load this business.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, localPreview]);

  const previewBusiness = localPreview ? getBusiness(id) : undefined;
  const business = details
    ? toBusinessHeader(details)
    : previewBusiness
      ? toPreviewBusinessHeader(previewBusiness)
      : null;

  if (loading) return <BusinessRouteState message="Loading business..." loading />;
  if (!business) return <BusinessRouteState message={loadError || "Business not found."} />;

  const items = subnav(business.id);
  const content = (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <SidebarTrigger />
          <div className="mx-1 h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/connect/admin/businesses">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Businesses</span>
            </Link>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/connect/admin/businesses/$id/live-test" params={{ id: business.id }}>
                <MessageCircle className="h-4 w-4" />
                Live test
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/connect/admin/businesses/$id/flow-builder" params={{ id: business.id }}>
                <Workflow className="h-4 w-4" />
                Open Flow Builder
              </Link>
            </Button>
          </div>
        </div>
        <div className="px-4 pb-3 pt-2 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold sm:text-2xl">{business.name}</h1>
                <BusinessStatusBadge status={business.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {business.category} / {business.waNumber} / Owner {business.owner}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border bg-muted/50 px-2 py-1">
                WhatsApp {business.connectionStatus}
              </span>
              <span className="rounded-md border bg-info/10 px-2 py-1 text-info">
                Health {business.healthStatus}
              </span>
            </div>
          </div>
        </div>
        <nav className="border-t bg-background/60">
          <div className="overflow-x-auto">
            <ul className="flex min-w-max gap-1 px-4 sm:px-6">
              {items.map((item) => {
                const active = item.exact
                  ? pathname === item.to
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "inline-block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>
      <div className="px-4 py-6 pb-12 sm:px-6">
        <Outlet />
      </div>
    </>
  );

  return details ? (
    <BusinessDetailsContext.Provider value={details}>{content}</BusinessDetailsContext.Provider>
  ) : (
    content
  );
}

function BusinessRouteState({ message, loading = false }: { message: string; loading?: boolean }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {message}
    </div>
  );
}

function toPreviewBusinessHeader(business: PreviewBusiness): FlowManagerBusinessHeader {
  return {
    id: business.id,
    name: business.name,
    owner: business.owner,
    category: business.category,
    waNumber: business.waNumber,
    status: business.status,
    connectionStatus: business.waNumber === "Not connected" ? "MISSING" : "ACTIVE",
    healthStatus: business.status === "live" ? "OK" : "WARNING",
  };
}
