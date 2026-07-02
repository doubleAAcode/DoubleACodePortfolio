import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageCheck } from "lucide-react";

export const Route = createFileRoute("/dashboard/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-8 text-center">
      <PackageCheck className="mx-auto h-8 w-8 text-muted-foreground" />
      <h1 className="mt-3 font-display text-2xl font-semibold">
        Order management is not enabled yet
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        Milestone 8 is limited to catalog and store settings. Orders are still stored by the
        WhatsApp flow, but owner accept/reject tools will come in a later milestone.
      </p>
      <Link to="/dashboard" className="studio-button mt-5">
        Back to overview
      </Link>
    </div>
  );
}
