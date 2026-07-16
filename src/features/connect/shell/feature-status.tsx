import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ConnectFeatureStatus } from "./feature-registry";

const statusCopy: Record<ConnectFeatureStatus, { label: string; className: string }> = {
  live: {
    label: "Live",
    className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700",
  },
  building: {
    label: "Building",
    className: "border-amber-500/35 bg-amber-500/10 text-amber-800",
  },
  future: {
    label: "Future work",
    className: "border-border bg-muted/40 text-muted-foreground",
  },
};

export function FeatureStatusBadge({
  status,
  compact = false,
  className,
}: {
  status: ConnectFeatureStatus;
  compact?: boolean;
  className?: string;
}) {
  const copy = statusCopy[status];
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", copy.className, className)}>
      {compact && status === "future" ? "Future" : copy.label}
    </Badge>
  );
}

export function FeatureStatusNotice({ status }: { status: ConnectFeatureStatus }) {
  if (status === "live") return null;

  const future = status === "future";
  return (
    <section
      className={cn(
        "border-y px-4 py-3 text-sm md:px-6",
        future
          ? "border-border bg-muted/25 text-muted-foreground"
          : "border-amber-500/30 bg-amber-500/10 text-amber-900",
      )}
    >
      <span className="font-semibold">{future ? "Future work." : "Being connected."}</span>{" "}
      {future
        ? "UI preview only. Data is illustrative, and actions do not save or send."
        : "The product surface is available for review, but the full backend contract is not complete yet."}
    </section>
  );
}
