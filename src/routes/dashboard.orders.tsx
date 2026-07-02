import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageCheck, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getWaDashboardOrders } from "@/lib/whatsapp/dashboard-client";
import { getWaDashboardBasePath } from "@/lib/whatsapp/dashboard-paths";
import type {
  DashboardOrderStatus,
  DashboardOrderSummary,
} from "@/lib/whatsapp/order-dashboard-store.server";

export const Route = createFileRoute("/dashboard/orders")({
  component: OrdersPage,
});

const filters: Array<{ label: string; value: DashboardOrderStatus | "ALL" }> = [
  { label: "Pending", value: "PENDING_OWNER_CONFIRMATION" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: "ALL" },
];

export function OrdersPage() {
  const [status, setStatus] = useState<DashboardOrderStatus | "ALL">("PENDING_OWNER_CONFIRMATION");
  const [orders, setOrders] = useState<DashboardOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await getWaDashboardOrders(status));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadOrders();
    const interval = window.setInterval(() => void loadOrders(), 15000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Sales</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Orders</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review pending WhatsApp orders and accept or reject them safely.
          </p>
        </div>
        <button type="button" onClick={() => void loadOrders()} className="studio-button w-fit">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={`rounded-md border px-3 py-2 text-sm transition ${
              status === filter.value
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-border bg-surface/60 p-8 text-sm text-muted-foreground">
          Loading orders...
        </div>
      ) : orders.length ? (
        <section className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-border bg-surface/60 p-8 text-center">
          <PackageCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-xl font-semibold">No orders found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            New pending WhatsApp orders will appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: DashboardOrderSummary }) {
  const basePath = getWaDashboardBasePath();

  return (
    <Link
      to={`${basePath}/orders/${order.id}`}
      className="block rounded-lg border border-border bg-surface/60 p-4 transition hover:border-primary"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold">{order.order_number}</h2>
            {order.status === "PENDING_OWNER_CONFIRMATION" ? (
              <span className="rounded-md bg-primary/15 px-2 py-1 text-xs text-primary">New</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customer_name} · {maskPhone(order.customer_phone)} ·{" "}
            {formatDate(order.created_at)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.item_count} item(s) · {order.fulfillment_method} · reservation{" "}
            {order.reservation_status.toLowerCase()}
          </p>
        </div>
        <div className="text-left lg:text-right">
          <div className="font-display text-2xl font-semibold">{formatMoney(order.total)}</div>
          <div className={statusClass(order.status)}>{formatStatus(order.status)}</div>
        </div>
      </div>
    </Link>
  );
}

function formatStatus(status: DashboardOrderStatus) {
  if (status === "PENDING_OWNER_CONFIRMATION") return "Pending";
  return status[0] + status.slice(1).toLowerCase();
}

function statusClass(status: DashboardOrderStatus) {
  if (status === "ACCEPTED") return "text-sm text-emerald-400";
  if (status === "REJECTED") return "text-sm text-destructive";
  return "text-sm text-primary";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value: number | string) {
  return `$${Number(value).toFixed(2)}`;
}

function maskPhone(phone: string) {
  if (phone.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}
