import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Box,
  ChevronRight,
  CircleAlert,
  MessageSquare,
  ShoppingCart,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getWaDashboardCatalog,
  getWaDashboardOrders,
  getWaOwnerNotifications,
} from "@/features/connect/shared/dashboard-client";

type ClientHomeSnapshot = {
  catalog: Awaited<ReturnType<typeof getWaDashboardCatalog>>;
  orders: Awaited<ReturnType<typeof getWaDashboardOrders>>;
  notifications: Awaited<ReturnType<typeof getWaOwnerNotifications>>;
};

export const Route = createFileRoute("/connect/client/")({
  component: ClientHomePage,
});

function ClientHomePage() {
  const [snapshot, setSnapshot] = useState<ClientHomeSnapshot>();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([getWaDashboardCatalog(), getWaDashboardOrders("ALL"), getWaOwnerNotifications()])
      .then(([catalog, orders, notifications]) => {
        if (mounted) setSnapshot({ catalog, orders, notifications });
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Could not load workspace data.");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-5 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4" />
          <div>
            <div className="font-semibold">Client data could not be loaded</div>
            <p className="mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) return <p className="text-sm text-muted-foreground">Loading business data...</p>;

  const { catalog, orders, notifications } = snapshot;
  const activeProducts = catalog.products.filter(
    (product) => product.is_active && product.is_available,
  ).length;
  const pendingOrders = orders.filter(
    (order) => order.status === "PENDING_OWNER_CONFIRMATION",
  ).length;
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Store className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold">{catalog.business.name}</div>
              <p className="text-xs text-muted-foreground">
                Live WhatsApp commerce data from the authorized workspace.
              </p>
            </div>
          </div>
          <Badge variant={catalog.business.is_active ? "default" : "secondary"} className="w-fit">
            {catalog.business.is_active ? "Business active" : "Business paused"}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Box}
          label="Active products"
          value={activeProducts}
          href="/connect/client/catalog"
        />
        <MetricCard
          icon={ShoppingCart}
          label="Total orders"
          value={orders.length}
          href="/connect/client/orders"
        />
        <MetricCard
          icon={CircleAlert}
          label="Awaiting approval"
          value={pendingOrders}
          href="/connect/client/orders"
        />
        <MetricCard icon={Bell} label="Unread alerts" value={notifications.unreadCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">Recent orders</CardTitle>
              <CardDescription>Latest protected WhatsApp checkout records.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <a href="/connect/client/orders">
                View all <ChevronRight className="size-4" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length ? (
              <div className="divide-y">
                {recentOrders.map((order) => (
                  <a
                    key={order.id}
                    href="/connect/client/orders"
                    className="grid gap-2 py-3 text-sm transition hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4 sm:px-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">Order {order.order_number}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {order.customer_name}
                      </div>
                    </div>
                    <Badge variant="secondary">{formatStatus(order.status)}</Badge>
                    <div className="font-medium tabular-nums">
                      {Number(order.total).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                      {catalog.business.currency}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">WhatsApp scope</CardTitle>
            <CardDescription>Current product focus.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-2 rounded-md border bg-muted/25 p-3">
              <MessageSquare className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Deterministic messaging, commerce flows, and human handoff.</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI agents and additional channels remain visible as labeled Future work screens.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
        <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
    </CardContent>
  );
  return (
    <Card className={href ? "transition hover:shadow-md" : ""}>
      {href ? <a href={href}>{content}</a> : content}
    </Card>
  );
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
