import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { decideWaDashboardOrder, getWaDashboardOrder } from "@/lib/whatsapp/dashboard-client";
import { getWaDashboardBasePath } from "@/lib/whatsapp/dashboard-paths";
import type { DashboardOrderDetails } from "@/lib/whatsapp/order-dashboard-store.server";

export const Route = createFileRoute("/dashboard/orders/$orderId")({
  component: DashboardOrderDetailsRoute,
});

function DashboardOrderDetailsRoute() {
  const { orderId } = Route.useParams();
  return <OrderDetailsPage orderId={orderId} />;
}

export function OrderDetailsPage({ orderId }: { orderId: string }) {
  const basePath = getWaDashboardBasePath();
  const [order, setOrder] = useState<DashboardOrderDetails>();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrder(await getWaDashboardOrder(orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function decide(action: "accept" | "reject") {
    if (!order) return;
    const message =
      action === "accept"
        ? `Accept ${order.order_number}? Stock will be deducted.`
        : `Reject ${order.order_number}? Reservations will be released.`;
    if (!window.confirm(message)) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await decideWaDashboardOrder(order.id, action, reason);
      setOrder(result.order);
      setNotice(
        action === "accept"
          ? `Order accepted. Customer notification ${result.notification.ok ? "sent" : "failed"}.`
          : `Order rejected. Customer notification ${result.notification.ok ? "sent" : "failed"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageState text="Loading order..." />;
  }

  if (!order) {
    return <PageState text={error || "Order was not found."} />;
  }

  const pending = order.status === "PENDING_OWNER_CONFIRMATION";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Link
            to={`${basePath}/orders`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Orders
          </Link>
          <p className="mt-4 text-xs uppercase tracking-[0.22em] text-muted-foreground">Order</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">{order.order_number}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{formatStatus(order.status)}</p>
        </div>
        <button type="button" onClick={() => void loadOrder()} className="studio-button w-fit">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? <Status tone="error" text={error} /> : null}
      {notice ? <Status tone="success" text={notice} /> : null}

      {pending ? (
        <section className="rounded-lg border border-border bg-surface/60 p-5">
          <h2 className="font-display text-xl font-semibold">Decision</h2>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
            <label className="min-w-0 flex-1 text-sm">
              <span className="mb-2 block text-muted-foreground">Rejection reason</span>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Optional reason shown to customer"
                className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
              />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void decide("accept")}
              className="studio-button-primary"
            >
              <Check className="h-4 w-4" />
              Accept order
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void decide("reject")}
              className="studio-button"
            >
              <X className="h-4 w-4" />
              Reject order
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Customer">
          <Info label="Name" value={order.customer_name} />
          <Info label="WhatsApp" value={order.customer_phone} />
          <Info label="Alternate phone" value={order.alternate_phone ?? "-"} />
          <Info label="Language" value={order.language} />
        </Panel>

        <Panel title="Fulfillment">
          <Info label="Method" value={order.fulfillment_method} />
          <Info label="Area" value={order.delivery_area_label ?? order.delivery_area_id ?? "-"} />
          <Info label="Address" value={order.delivery_address ?? "-"} />
          <Info
            label="Location"
            value={
              order.delivery_latitude != null && order.delivery_longitude != null
                ? `${order.delivery_latitude}, ${order.delivery_longitude}`
                : "-"
            }
          />
          <Info
            label="Pickup"
            value={order.pickup_location_label ?? order.pickup_location_id ?? "-"}
          />
        </Panel>

        <Panel title="Payment and totals">
          <Info label="Payment" value={order.payment_method_label ?? order.payment_method} />
          <Info label="Subtotal" value={formatMoney(order.subtotal)} />
          <Info label="Delivery fee" value={formatMoney(order.delivery_fee)} />
          <Info label="Final total" value={formatMoney(order.total)} />
        </Panel>
      </section>

      <Panel title="Items">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="border-b border-border px-3 py-2">Product</th>
                <th className="border-b border-border px-3 py-2">Options</th>
                <th className="border-b border-border px-3 py-2">Fields</th>
                <th className="border-b border-border px-3 py-2 text-right">Qty</th>
                <th className="border-b border-border px-3 py-2 text-right">Unit</th>
                <th className="border-b border-border px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-border px-3 py-3 align-top">
                    <div className="font-medium">{item.product_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Code/SKU: {item.product_code}
                    </div>
                    {item.variant_id ? (
                      <div className="text-xs text-muted-foreground">
                        Variant: {item.variant_id}
                      </div>
                    ) : null}
                  </td>
                  <td className="border-b border-border px-3 py-3 align-top text-muted-foreground">
                    {formatPairs(item.selected_options)}
                  </td>
                  <td className="border-b border-border px-3 py-3 align-top text-muted-foreground">
                    {formatPairs(item.custom_field_answers)}
                  </td>
                  <td className="border-b border-border px-3 py-3 text-right align-top">
                    {item.quantity}
                  </td>
                  <td className="border-b border-border px-3 py-3 text-right align-top">
                    {formatMoney(item.unit_price)}
                  </td>
                  <td className="border-b border-border px-3 py-3 text-right align-top">
                    {formatMoney(item.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Reservation">
          {order.reservations.length ? (
            order.reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="border-b border-border py-2 text-sm last:border-0"
              >
                <div className="font-medium">{reservation.product_variant_id}</div>
                <div className="text-muted-foreground">
                  {reservation.quantity} reserved · {reservation.status} · expires{" "}
                  {formatDate(reservation.expires_at)}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No reservation records.</p>
          )}
        </Panel>

        <Panel title="Audit">
          <Info label="Created" value={formatDate(order.created_at)} />
          <Info label="Accepted" value={order.accepted_at ? formatDate(order.accepted_at) : "-"} />
          <Info label="Rejected" value={order.rejected_at ? formatDate(order.rejected_at) : "-"} />
          <Info label="Decided by" value={order.decided_by ?? "-"} />
          <Info label="Reason" value={order.rejection_reason ?? "-"} />
          <Info label="Notification" value={order.customer_notification_status} />
          <Info label="Notification error" value={order.customer_notification_error ?? "-"} />
          <Info
            label="Template required"
            value={order.template_notification_required ? "Yes" : "No"}
          />
          <Info label="Notes" value={order.notes ?? "-"} />
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-5">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[70%] text-right font-medium">{value}</span>
    </div>
  );
}

function Status({ tone, text }: { tone: "error" | "success"; text: string }) {
  return (
    <p
      className={
        tone === "error"
          ? "rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          : "rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
      }
    >
      {text}
    </p>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-8 text-muted-foreground">
      {text}
    </div>
  );
}

function formatStatus(status: string) {
  if (status === "PENDING_OWNER_CONFIRMATION") return "Pending owner confirmation";
  return status[0] + status.slice(1).toLowerCase();
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

function formatPairs(items: Array<{ label: string; value: string }>) {
  return items.length ? items.map((item) => `${item.label}: ${item.value}`).join("\n") : "-";
}
