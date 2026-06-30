import { createFileRoute } from "@tanstack/react-router";
import { PackageCheck } from "lucide-react";
import { useStoreBotState } from "@/stores/store-bot/use-store-bot-state";

export const Route = createFileRoute("/dashboard/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { state } = useStoreBotState();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Sales</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Orders</h1>
      </div>

      {state.orders.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface/60 p-8 text-center">
          <PackageCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-xl font-semibold">No orders yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Confirmed simulator orders will appear here.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {state.orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-border bg-surface/60 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="font-display text-xl font-semibold">{order.orderNumber}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {order.customerName} · {order.customerPhone} ·{" "}
                    {new Date(order.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{order.deliveryAddress}</div>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-sm text-emerald-400">{order.status}</div>
                  <div className="font-display text-2xl font-semibold">
                    ${order.total.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-md border border-border">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_72px_90px] gap-3 border-b border-border px-3 py-2 text-sm last:border-0"
                  >
                    <span>
                      {item.productName}
                      {item.variantName ? (
                        <span className="text-muted-foreground"> · {item.variantName}</span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground">x{item.quantity}</span>
                    <span className="text-right">${item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
