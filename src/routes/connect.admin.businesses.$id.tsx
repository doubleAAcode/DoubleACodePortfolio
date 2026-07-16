import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { getBusiness } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { BusinessStatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, MessageCircle, Workflow } from "lucide-react";
import { notFound } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect/admin/businesses/$id")({
  loader: ({ params }) => {
    const b = getBusiness(params.id);
    if (!b) throw notFound();
    return { business: b };
  },
  component: BusinessLayout,
  notFoundComponent: () => (
    <div className="p-8 text-sm text-muted-foreground">Business not found.</div>
  ),
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
  const { business } = Route.useLoaderData();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const items = subnav(business.id);

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <SidebarTrigger />
          <div className="h-6 w-px bg-border mx-1" />
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
        <div className="px-4 sm:px-6 pb-3 pt-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="truncate text-xl font-semibold sm:text-2xl">{business.name}</h1>
                <BusinessStatusBadge status={business.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {business.category} · {business.waNumber} · Owner {business.owner}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border bg-muted/50 px-2 py-1">
                Live v{business.liveVersion}
              </span>
              <span className="rounded-md border bg-info/10 text-info px-2 py-1">
                Draft v{business.draftVersion}
              </span>
            </div>
          </div>
        </div>
        <nav className="border-t bg-background/60">
          <div className="overflow-x-auto">
            <ul className="flex min-w-max gap-1 px-4 sm:px-6">
              {items.map((it) => {
                const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={cn(
                        "inline-block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>
      <div className="px-4 sm:px-6 py-6 pb-12">
        <Outlet />
      </div>
    </>
  );
}
