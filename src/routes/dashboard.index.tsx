import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Boxes, FolderTree, MapPinned, SlidersHorizontal } from "lucide-react";

import { getWaDashboardBasePath } from "@/lib/whatsapp/dashboard-paths";
import { formatMoney, useWaDashboardData } from "@/lib/whatsapp/use-wa-dashboard-data";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

export function DashboardHome() {
  const { data, loading, error } = useWaDashboardData();
  const basePath = getWaDashboardBasePath();

  if (loading) return <PageState text="Loading dashboard..." />;
  if (error || !data) return <PageState text={error || "Dashboard data could not be loaded."} />;

  const activeCategories = data.categories.filter((category) => category.is_active);
  const activeProducts = data.products.filter((product) => product.is_active);
  const unavailableProducts = data.products.filter(
    (product) => product.is_active && !product.is_available,
  );
  const lowStockVariants = data.variants.filter(
    (variant) => variant.is_available && variant.stock_quantity > 0 && variant.stock_quantity <= 3,
  );
  const latestChanges = [
    ...data.products.map((row) => ({ label: row.name_english || row.code, date: row.updated_at })),
    ...data.categories.map((row) => ({ label: row.name_english, date: row.updated_at })),
    ...data.deliveryAreas.map((row) => ({ label: row.name_english, date: row.updated_at })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Milestone 8</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Owner Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Live catalog and checkout settings for {data.business.name}. Changes are read by the
            WhatsApp bot without redeployment.
          </p>
        </div>
        <Link to={`${basePath}/products`} className="studio-button-primary w-fit">
          Manage products
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Active categories" value={activeCategories.length} icon={FolderTree} />
        <Metric label="Active products" value={activeProducts.length} icon={Boxes} />
        <Metric label="Low stock variants" value={lowStockVariants.length} icon={AlertTriangle} />
        <Metric
          label="Unavailable products"
          value={unavailableProducts.length}
          icon={SlidersHorizontal}
        />
        <Metric label="Delivery areas" value={data.deliveryAreas.length} icon={MapPinned} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-border bg-surface/60 p-5">
          <h2 className="font-display text-xl font-semibold">Catalog health</h2>
          <div className="mt-4 space-y-3 text-sm">
            <HealthRow label="Currency" value={data.business.currency} />
            <HealthRow
              label="Minimum order"
              value={formatMoney(data.business.minimum_order_amount, data.business.currency)}
            />
            <HealthRow
              label="Delivery"
              value={data.business.allow_delivery ? "Enabled" : "Disabled"}
            />
            <HealthRow label="Pickup" value={data.business.allow_pickup ? "Enabled" : "Disabled"} />
            <HealthRow
              label="Active payment methods"
              value={String(data.paymentMethods.filter((method) => method.is_active).length)}
            />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface/60 p-5">
          <h2 className="font-display text-xl font-semibold">Recent configuration changes</h2>
          <div className="mt-4 space-y-3 text-sm">
            {latestChanges.length ? (
              latestChanges.map((item) => (
                <div
                  key={`${item.label}-${item.date}`}
                  className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-right text-muted-foreground">{formatDate(item.date)}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No changes recorded yet.</p>
            )}
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

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-8 text-muted-foreground">
      {text}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
