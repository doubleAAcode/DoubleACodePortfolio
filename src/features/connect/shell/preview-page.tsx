import { ArrowUpRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { ConnectFeature } from "./feature-registry";
import { FeatureStatusBadge, FeatureStatusNotice } from "./feature-status";

export function ConnectFeaturePreview({ feature }: { feature: ConnectFeature }) {
  const Icon = feature.icon;

  return (
    <div className="overflow-hidden border border-border bg-surface/45">
      <div className="flex flex-col gap-5 px-5 py-6 md:flex-row md:items-start md:justify-between md:px-7">
        <div className="flex min-w-0 gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-semibold">{feature.title}</h1>
              <FeatureStatusBadge status={feature.status} />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {feature.summary}
            </p>
          </div>
        </div>
        {feature.legacyHref ? (
          <Button asChild>
            <a href={feature.legacyHref}>
              {feature.legacyLabel ?? "Open current tool"}
              <ArrowUpRight className="ml-2 size-4" />
            </a>
          </Button>
        ) : null}
      </div>

      <FeatureStatusNotice status={feature.status} />

      <section className="px-5 py-6 md:px-7">
        <h2 className="text-sm font-semibold">Planned capability</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {feature.capabilities.map((capability) => (
            <div
              key={capability}
              className="flex min-h-24 gap-3 rounded-md border border-border bg-background/55 p-4"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-sm leading-6">{capability}</span>
            </div>
          ))}
        </div>
        {feature.status === "future" ? (
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            This route remains visible so the intended product stays legible while WhatsApp flow and
            messaging foundations are completed first.
          </p>
        ) : null}
      </section>
    </div>
  );
}
