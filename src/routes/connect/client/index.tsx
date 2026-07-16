import { createFileRoute } from "@tanstack/react-router";
import { Bell, Box, ChevronRight, CircleAlert, ShoppingCart, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
        if (mounted)
          setError(err instanceof Error ? err.message : "Could not load workspace data.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <section className="border border-destructive/35 bg-destructive/10 p-5 text-sm text-destructive">
        <div className="flex items-center gap-2 font-semibold">
          <CircleAlert className="size-4" />
          Client data could not be loaded
        </div>
        <p className="mt-2 text-destructive/85">{error}</p>
      </section>
    );
  }

  if (!snapshot) {
    return <p className="text-sm text-muted-foreground">Loading business data...</p>;
  }

  const { catalog, orders, notifications } = snapshot;
  const activeProducts = catalog.products.filter(
    (product) => product.is_active && product.is_available,
  ).length;
  const pendingOrders = orders.filter(
    (order) => order.status === "PENDING_OWNER_CONFIRMATION",
  ).length;
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Store className="size-4 text-primary" />
            Business workspace
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold">{catalog.business.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Live commerce data from the current WhatsApp backend. Flow authoring will move into this
            workspace without replacing protected order and inventory rules.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            catalog.business.is_active
              ? "w-fit border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
              : "w-fit border-amber-500/35 bg-amber-500/10 text-amber-200"
          }
        >
          {catalog.business.is_active ? "Business active" : "Business paused"}
        </Badge>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          href="/connect/dashboard/orders"
        />
        <MetricCard
          icon={Bell}
          label="Unread alerts"
          value={notifications.unreadCount}
          href="/connect/dashboard"
        />
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Recent orders</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Real orders from the current backend.
            </p>
          </div>
          <a
            href="/connect/dashboard/orders"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Open orders
            <ChevronRight className="size-4" />
          </a>
        </div>

        <div className="mt-4 overflow-hidden border border-border">
          {recentOrders.length ? (
            <div className="divide-y divide-border">
              {recentOrders.map((order) => (
                <a
                  key={order.id}
                  href={`/connect/dashboard/orders/${order.id}`}
                  className="grid gap-2 bg-surface/35 px-4 py-3 transition hover:bg-surface md:grid-cols-[1fr_1fr_auto_auto] md:items-center md:gap-4"
                >
                  <div>
                    <div className="text-sm font-medium">Order {order.order_number}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {order.customer_name}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatStatus(order.status)}</div>
                  <div className="text-sm font-medium tabular-nums">
                    {Number(order.total).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                    {catalog.business.currency}
                  </div>
                  <ChevronRight className="hidden size-4 text-muted-foreground md:block" />
                </a>
              ))}
            </div>
          ) : (
            <p className="bg-surface/35 px-4 py-8 text-center text-sm text-muted-foreground">
              No orders yet.
            </p>
          )}
        </div>
      </section>
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
  href: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-md border border-border bg-surface/45 p-4 transition hover:border-primary/45 hover:bg-surface"
    >
      <div className="flex items-center justify-between gap-3">
        <Icon className="size-4 text-primary" />
        <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <div className="mt-5 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </a>
  );
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
