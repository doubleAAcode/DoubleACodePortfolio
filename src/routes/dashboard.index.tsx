import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, CheckCircle2, Circle, MessageSquareText, Settings, ShoppingCart, Truck } from "lucide-react";

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

  const activeProducts = data.products.filter((product) => product.is_active);
  const productsWithVariants = new Set(data.variants.map((variant) => variant.product_id));
  const hasVariantCatalog = activeProducts.some((product) => productsWithVariants.has(product.id));
  const activePayments = data.paymentMethods.filter((method) => method.is_active);
  const deliveryReady = !data.business.allow_delivery || data.deliveryAreas.some((area) => area.is_active);
  const pickupReady = !data.business.allow_pickup || data.pickupLocations.some((location) => location.is_active);
  const checkoutReady = activePayments.length > 0 && deliveryReady && pickupReady;
  const botReady = Boolean(data.botFlowSettings.welcomeMessageEnglish.trim());
  const lowStockVariants = data.variants.filter(
    (variant) => variant.is_available && variant.stock_quantity > 0 && variant.stock_quantity <= 3,
  );
  const unavailableProducts = activeProducts.filter((product) => !product.is_available);

  const steps = [
    {
      label: "Add products",
      detail: `${activeProducts.length} active product${activeProducts.length === 1 ? "" : "s"}`,
      done: activeProducts.length > 0,
      to: `${basePath}/products`,
      icon: Boxes,
    },
    {
      label: "Set variant prices and stock",
      detail: hasVariantCatalog ? "Sellable choices are configured" : "Use this for size, color, or flavor",
      done: hasVariantCatalog,
      to: `${basePath}/products`,
      icon: ShoppingCart,
    },
    {
      label: "Prepare checkout",
      detail: checkoutReady ? "Payments and fulfillment are ready" : "Add payment and delivery or pickup options",
      done: checkoutReady,
      to: `${basePath}/settings`,
      icon: Truck,
    },
    {
      label: "Review bot flow",
      detail: botReady ? "Main menu has a message" : "Set the message customers see first",
      done: botReady,
      to: `${basePath}/settings`,
      icon: Settings,
    },
    {
      label: "Test the WhatsApp path",
      detail: "Run one real customer-style order before going live",
      done: false,
      to: `${basePath}/simulator`,
      icon: MessageSquareText,
    },
  ];
  const completed = steps.filter((step) => step.done).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Partner setup</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Get {data.business.name} ready for orders
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Follow the setup path, then test the same flow your WhatsApp customers will use.
          </p>
        </div>
        <Link to={`${basePath}/products`} className="studio-button-primary w-fit">
          Continue setup
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-surface/70 p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-semibold">Setup progress</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {completed} of {steps.length} core steps are ready.
            </p>
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            {Math.round((completed / steps.length) * 100)}% complete
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {steps.map((step) => (
            <SetupStep key={step.label} {...step} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-border bg-surface/70 p-5">
          <h2 className="font-display text-xl font-semibold">What needs attention</h2>
          <div className="mt-4 space-y-3 text-sm">
            <AttentionRow
              label="Low stock variants"
              value={`${lowStockVariants.length}`}
              tone={lowStockVariants.length ? "warn" : "ok"}
            />
            <AttentionRow
              label="Unavailable active products"
              value={`${unavailableProducts.length}`}
              tone={unavailableProducts.length ? "warn" : "ok"}
            />
            <AttentionRow
              label="Active payment methods"
              value={`${activePayments.length}`}
              tone={activePayments.length ? "ok" : "warn"}
            />
            <AttentionRow
              label="Minimum order"
              value={formatMoney(data.business.minimum_order_amount, data.business.currency)}
              tone="ok"
            />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface/70 p-5">
          <h2 className="font-display text-xl font-semibold">Next best action</h2>
          <p className="mt-3 text-sm text-muted-foreground">{getNextAction(steps)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`${basePath}/products`} className="studio-button">
              Products
            </Link>
            <Link to={`${basePath}/settings`} className="studio-button">
              Settings
            </Link>
            <Link to={`${basePath}/simulator`} className="studio-button-primary">
              Test flow
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function SetupStep({
  label,
  detail,
  done,
  to,
  icon: Icon,
}: {
  label: string;
  detail: string;
  done: boolean;
  to: string;
  icon: typeof Boxes;
}) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-border bg-background/70 p-4 transition hover:border-primary/40 hover:bg-surface"
    >
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-4 w-4 text-primary" />
        {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-4 font-medium">{label}</div>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </Link>
  );
}

function AttentionRow({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "warn" ? "font-medium text-destructive" : "font-medium"}>{value}</span>
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

function getNextAction(steps: Array<{ label: string; detail: string; done: boolean }>) {
  const next = steps.find((step) => !step.done);
  if (!next) return "Everything important is configured. Run a final WhatsApp test order.";
  if (next.label === "Test the WhatsApp path") return next.detail;
  return `Next: ${next.label}.`;
}
