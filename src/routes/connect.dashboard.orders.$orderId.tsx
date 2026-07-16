import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock, PackageCheck, RefreshCw, Truck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  decideWaDashboardOrder,
  getWaDashboardOrder,
} from "@/features/connect/shared/dashboard-client";
import { getWaDashboardBasePath } from "@/features/connect/shared/dashboard-paths";
import type {
  DashboardLifecycleAction,
  DashboardOrderDetails,
  DashboardOrderStatus,
} from "@/features/connect/shared/order-dashboard-store.server";

export const Route = createFileRoute("/connect/dashboard/orders/$orderId")({
  component: DashboardOrderDetailsRoute,
});

type OrderAction = {
  action: DashboardLifecycleAction;
  label: string;
  confirm: string;
  tone?: "primary" | "danger";
};

function DashboardOrderDetailsRoute() {
  const { orderId } = Route.useParams();
  return <OrderDetailsPage orderId={orderId} />;
}

export function OrderDetailsPage({ orderId }: { orderId: string }) {
  const basePath = getWaDashboardBasePath();
  const [order, setOrder] = useState<DashboardOrderDetails>();
  const [reason, setReason] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
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

  const lifecycleActions = useMemo(() => (order ? getLifecycleActions(order) : []), [order]);

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
      setReason("");
      setNotice(
        getNotificationNotice(
          action === "accept" ? "Order accepted" : "Order rejected",
          result.notification,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order.");
    } finally {
      setSaving(false);
    }
  }

  async function transition(action: OrderAction) {
    if (!order) return;
    const cleanReason = cancellationReason.trim();
    if (action.action === "cancel" && !cleanReason) {
      setError("Cancellation reason is required.");
      return;
    }
    if (!window.confirm(action.confirm)) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await decideWaDashboardOrder(order.id, action.action, cleanReason);
      setOrder(result.order);
      if (action.action === "cancel") setCancellationReason("");
      setNotice(getNotificationNotice(`${action.label} saved`, result.notification));
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
  const terminal = ["COMPLETED", "REJECTED", "CANCELLED"].includes(order.status);

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
      {order.restock_required ? (
        <Status
          tone="warning"
          text="This cancellation happened after stock was committed. Stock was not restored automatically."
        />
      ) : null}

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

      {!terminal ? (
        <section className="rounded-lg border border-border bg-surface/60 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Lifecycle</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Current status: {formatStatus(order.status)}
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:min-w-[24rem]">
              {lifecycleActions.some((item) => item.action === "cancel") ? (
                <label className="text-sm">
                  <span className="mb-2 block text-muted-foreground">Cancellation reason</span>
                  <input
                    value={cancellationReason}
                    onChange={(event) => setCancellationReason(event.target.value)}
                    placeholder="Required before cancelling"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {lifecycleActions.map((item) => (
                  <button
                    key={item.action}
                    type="button"
                    disabled={saving}
                    onClick={() => void transition(item)}
                    className={item.tone === "primary" ? "studio-button-primary" : "studio-button"}
                  >
                    {actionIcon(item.action)}
                    {item.label}
                  </button>
                ))}
                {!lifecycleActions.length ? (
                  <p className="text-sm text-muted-foreground">
                    {terminal ? "This order is terminal." : "No valid actions are available."}
                  </p>
                ) : null}
              </div>
            </div>
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
                  <td className="whitespace-pre-line border-b border-border px-3 py-3 align-top text-muted-foreground">
                    {formatPairs(item.selected_options)}
                  </td>
                  <td className="whitespace-pre-line border-b border-border px-3 py-3 align-top text-muted-foreground">
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
        <Panel title="Timeline">
          <Timeline order={order} />
        </Panel>

        <Panel title="Notifications">
          <Info label="Latest status" value={order.customer_notification_status} />
          <Info label="Latest error" value={order.customer_notification_error ?? "-"} />
          <Info
            label="Template required"
            value={order.template_notification_required ? "Yes" : "No"}
          />
          {order.notifications.length ? (
            <div className="space-y-2 pt-2">
              {order.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border-b border-border pb-2 text-sm last:border-0"
                >
                  <div className="font-medium">
                    {formatStatus(notification.order_status)} / {notification.status}
                  </div>
                  <div className="text-muted-foreground">
                    {notification.sent_at
                      ? `Sent ${formatDate(notification.sent_at)}`
                      : `Created ${formatDate(notification.created_at)}`}
                  </div>
                  {notification.error_message ? (
                    <div className="text-destructive">{notification.error_message}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notification records yet.</p>
          )}
          {order.ownerNotifications.length ? (
            <div className="space-y-2 pt-3">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Owner alerts
              </div>
              {order.ownerNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border-b border-border pb-2 text-sm last:border-0"
                >
                  <div className="font-medium">
                    {notification.type} / {notification.channel} / {notification.status}
                  </div>
                  <div className="text-muted-foreground">
                    {notification.sent_at
                      ? `Sent ${formatDate(notification.sent_at)}`
                      : `Created ${formatDate(notification.created_at)}`}
                  </div>
                  {notification.error_message ? (
                    <div className="text-destructive">{notification.error_message}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </Panel>
      </section>

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
                  {reservation.quantity} reserved / {reservation.status} / expires{" "}
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
          <Info label="Accepted" value={formatOptionalDate(order.accepted_at)} />
          <Info label="Preparing" value={formatOptionalDate(order.preparing_at)} />
          <Info label="Ready" value={formatOptionalDate(order.ready_at)} />
          <Info label="Out for delivery" value={formatOptionalDate(order.out_for_delivery_at)} />
          <Info label="Completed" value={formatOptionalDate(order.completed_at)} />
          <Info label="Rejected" value={formatOptionalDate(order.rejected_at)} />
          <Info label="Cancelled" value={formatOptionalDate(order.cancelled_at)} />
          <Info label="Decided by" value={order.decided_by ?? "-"} />
          <Info label="Rejection reason" value={order.rejection_reason ?? "-"} />
          <Info label="Cancellation reason" value={order.cancellation_reason ?? "-"} />
          <Info label="Restock required" value={order.restock_required ? "Yes" : "No"} />
          <Info label="Notes" value={order.notes ?? "-"} />
        </Panel>
      </section>
    </div>
  );
}

function getLifecycleActions(order: DashboardOrderDetails): OrderAction[] {
  if (order.status === "PENDING_OWNER_CONFIRMATION") {
    return [cancelAction(order)];
  }

  if (order.status === "ACCEPTED") {
    return [
      {
        action: "start_preparing",
        label: "Start preparing",
        confirm: `Start preparing ${order.order_number}?`,
        tone: "primary",
      },
      cancelAction(order),
    ];
  }

  if (order.status === "PREPARING") {
    return [
      {
        action: "mark_ready",
        label: "Mark ready",
        confirm: `Mark ${order.order_number} as ready?`,
        tone: "primary",
      },
      cancelAction(order),
    ];
  }

  if (order.status === "READY") {
    return order.fulfillment_method === "pickup"
      ? [
          {
            action: "complete",
            label: "Mark completed",
            confirm: `Complete pickup order ${order.order_number}?`,
            tone: "primary",
          },
          cancelAction(order),
        ]
      : [
          {
            action: "out_for_delivery",
            label: "Out for delivery",
            confirm: `Mark ${order.order_number} as out for delivery?`,
            tone: "primary",
          },
          cancelAction(order),
        ];
  }

  if (order.status === "OUT_FOR_DELIVERY") {
    return [
      {
        action: "complete",
        label: "Mark completed",
        confirm: `Complete delivery order ${order.order_number}?`,
        tone: "primary",
      },
      cancelAction(order),
    ];
  }

  return [];
}

function cancelAction(order: DashboardOrderDetails): OrderAction {
  return {
    action: "cancel",
    label: "Cancel order",
    confirm: `Cancel ${order.order_number}? Stock will not be restored automatically.`,
    tone: "danger",
  };
}

function actionIcon(action: DashboardLifecycleAction) {
  if (action === "out_for_delivery") return <Truck className="h-4 w-4" />;
  if (action === "complete") return <PackageCheck className="h-4 w-4" />;
  if (action === "cancel") return <X className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

function Timeline({ order }: { order: DashboardOrderDetails }) {
  const entries = [
    { label: "Order created", status: "PENDING_OWNER_CONFIRMATION", at: order.created_at },
    ...order.history.map((item) => ({
      label: formatStatus(item.new_status),
      status: item.new_status,
      at: item.created_at,
      reason: item.reason,
      actor: item.changed_by_user_id ?? item.source,
    })),
  ];

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={`${entry.status}-${entry.at}-${index}`} className="flex gap-3">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="min-w-0 border-b border-border pb-3 text-sm last:border-0">
            <div className="font-medium">{entry.label}</div>
            <div className="text-muted-foreground">{formatDate(entry.at)}</div>
            {"actor" in entry && entry.actor ? (
              <div className="text-muted-foreground">By {entry.actor}</div>
            ) : null}
            {"reason" in entry && entry.reason ? (
              <div className="mt-1 text-muted-foreground">Reason: {entry.reason}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
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
      <span className="max-w-[70%] whitespace-pre-line text-right font-medium">{value}</span>
    </div>
  );
}

function Status({ tone, text }: { tone: "error" | "success" | "warning"; text: string }) {
  return (
    <p
      className={
        tone === "error"
          ? "rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          : tone === "warning"
            ? "rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"
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

function getNotificationNotice(
  prefix: string,
  notification:
    | { ok: true; messageId?: string }
    | { ok: false; status: number; errorCode?: string; errorMessage: string },
) {
  if (notification.ok) return `${prefix}. Customer notification sent or already recorded.`;
  if (notification.errorCode === "TEMPLATE_REQUIRED") {
    return `${prefix}. Customer notification needs a WhatsApp template because the 24-hour window is closed.`;
  }
  return `${prefix}. Customer notification failed.`;
}

function formatStatus(status: string) {
  if (status === "PENDING_OWNER_CONFIRMATION") return "Pending owner confirmation";
  return status
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null) {
  return value ? formatDate(value) : "-";
}

function formatMoney(value: number | string) {
  return `$${Number(value).toFixed(2)}`;
}

function formatPairs(items: Array<{ label: string; value: string }>) {
  return items.length ? items.map((item) => `${item.label}: ${item.value}`).join("\n") : "-";
}
