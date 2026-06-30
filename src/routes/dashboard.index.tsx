import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, FolderTree, MessageSquareText, RotateCcw, ShoppingCart } from "lucide-react";
import { TEST_BUSINESS_ID } from "@/stores/store-bot/seed";
import { useStoreBotState } from "@/stores/store-bot/use-store-bot-state";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const { state, reset } = useStoreBotState();
  const products = state.products.filter((product) => product.businessId === TEST_BUSINESS_ID);
  const activeProducts = products.filter((product) => product.isActive);
  const lowStock = products.filter(
    (product) => product.stockQuantity > 0 && product.stockQuantity <= 5,
  ).length;
  const orderTotal = state.orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Milestone 1</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            WhatsApp Ordering Sandbox
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Local simulator for catalog management, conversation flow, order creation, and stock
            reduction.
          </p>
        </div>
        <button type="button" onClick={reset} className="studio-button w-fit">
          <RotateCcw className="h-4 w-4" />
          Reset seed data
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Categories" value={state.categories.length} icon={FolderTree} />
        <Metric label="Active products" value={activeProducts.length} icon={Boxes} />
        <Metric label="Orders" value={state.orders.length} icon={ShoppingCart} />
        <Metric label="Revenue" value={`$${orderTotal.toFixed(2)}`} icon={MessageSquareText} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-border bg-surface/60 p-5">
          <h2 className="font-display text-xl font-semibold">Next Manual Test</h2>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <Step label="1" text="Add or edit a category." />
            <Step label="2" text="Add a product, variant, and stock amount." />
            <Step label="3" text="Run a customer chat in the simulator." />
            <Step label="4" text="Confirm the order and verify stock drops once." />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/dashboard/products" className="studio-button">
              Manage products
            </Link>
            <Link to="/dashboard/simulator" className="studio-button-primary">
              Open simulator
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface/60 p-5">
          <h2 className="font-display text-xl font-semibold">Sandbox Health</h2>
          <div className="mt-4 space-y-3 text-sm">
            <HealthRow label="Bot engine" value="Separated from UI" />
            <HealthRow label="Persistence" value="Local browser storage" />
            <HealthRow label="Low-stock products" value={String(lowStock)} />
            <HealthRow label="WhatsApp API" value="Not integrated" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof FolderTree;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Step({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-md bg-background/45 p-3">
      <span className="text-primary">{label}</span>
      <span>{text}</span>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
