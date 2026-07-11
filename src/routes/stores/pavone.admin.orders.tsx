import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Phone } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/stores/pavone-new/lib/brand";
import {
  catalogKeys,
  fetchOrders,
  ORDER_STATUSES,
  updateOrderStatus,
  type OrderStatus,
  type PavoneNewOrder,
} from "@/stores/pavone-new/lib/catalog";

export const Route = createFileRoute("/stores/pavone/admin/orders")({
  component: AdminOrders,
  head: () => ({ meta: [{ title: "Orders - Admin" }, { name: "robots", content: "noindex" }] }),
});

const STATUS_STYLES: Record<OrderStatus, string> = {
  new: "bg-primary text-primary-foreground",
  confirmed: "bg-accent text-accent-foreground",
  preparing: "border border-border bg-secondary text-secondary-foreground",
  completed: "border border-border bg-secondary text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

function AdminOrders() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: catalogKeys.orders,
    queryFn: fetchOrders,
  });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () => (statusFilter ? orders.filter((order) => order.status === statusFilter) : orders),
    [orders, statusFilter],
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.orders });
      toast.success("Order status updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("")}
          className={`px-4 py-2 text-xs tracking-[0.12em] uppercase ${
            statusFilter === "" ? "bg-primary text-primary-foreground" : "border border-border"
          }`}
        >
          All ({orders.length})
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 text-xs tracking-[0.12em] uppercase ${
              statusFilter === status
                ? "bg-primary text-primary-foreground"
                : "border border-border"
            }`}
          >
            {status} ({orders.filter((order) => order.status === status).length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-sm text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="border border-border bg-background py-16 text-center">
          <p className="font-serif text-xl">No orders here yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            New customer orders will appear in this list.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => (
            <OrderItem
              key={order.id}
              order={order}
              open={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              onStatus={(status) => statusMutation.mutate({ id: order.id, status })}
              updating={statusMutation.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderItem({
  order,
  open,
  onToggle,
  onStatus,
  updating,
}: {
  order: PavoneNewOrder;
  open: boolean;
  onToggle: () => void;
  onStatus: (status: OrderStatus) => void;
  updating: boolean;
}) {
  return (
    <li className="border border-border bg-background">
      <button
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left sm:px-5"
        onClick={onToggle}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{order.customer_name}</p>
            <span
              className={`px-2 py-0.5 text-[0.625rem] tracking-[0.12em] uppercase ${
                STATUS_STYLES[order.status]
              }`}
            >
              {order.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.order_number} / {new Date(order.created_at).toLocaleString()} /{" "}
            {order.order_items.length} item(s) / {order.phone}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-serif text-lg">{formatPrice(order.total)}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-5 sm:px-5">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 text-sm">
              <div>
                <p className="label-elegant !mb-1">Phone</p>
                <a href={`tel:${order.phone}`} className="flex items-center gap-2 hover:underline">
                  <Phone className="h-3.5 w-3.5" /> {order.phone}
                </a>
              </div>
              {order.whatsapp && (
                <div>
                  <p className="label-elegant !mb-1">WhatsApp</p>
                  <a
                    href={`https://wa.me/${order.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {order.whatsapp}
                  </a>
                </div>
              )}
              <div>
                <p className="label-elegant !mb-1">Delivery Address</p>
                <p className="whitespace-pre-wrap">{order.address}</p>
              </div>
              {order.notes && (
                <div>
                  <p className="label-elegant !mb-1">Customer Notes</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{order.notes}</p>
                </div>
              )}
            </div>

            <div>
              <p className="label-elegant">Items</p>
              <ul className="divide-y divide-border border border-border">
                {order.order_items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[item.size, item.color].filter(Boolean).join(" / ")} x {item.quantity}
                      </p>
                    </div>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <p className="label-elegant">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {ORDER_STATUSES.map((status) => (
                    <button
                      key={status}
                      disabled={order.status === status || updating}
                      onClick={() => onStatus(status)}
                      className={`px-3 py-1.5 text-[0.65rem] tracking-[0.12em] uppercase transition-colors ${
                        order.status === status
                          ? "bg-primary text-primary-foreground"
                          : "border border-border hover:border-primary"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
