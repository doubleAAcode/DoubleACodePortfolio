import { CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { ConnectFeature } from "./feature-registry";
import { FeatureStatusBadge, FeatureStatusNotice } from "./feature-status";

export function ConnectFeaturePreview({ feature }: { feature: ConnectFeature }) {
  const Icon = feature.icon;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start gap-4 space-y-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base">{feature.title}</CardTitle>
              <FeatureStatusBadge status={feature.status} />
            </div>
            <CardDescription className="mt-2 max-w-2xl leading-6">
              {feature.summary}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <FeatureStatusNotice status={feature.status} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Planned capability</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {feature.capabilities.map((capability) => (
            <div key={capability} className="flex min-h-24 gap-3 rounded-md border bg-muted/25 p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-sm leading-6">{capability}</span>
            </div>
          ))}
        </CardContent>
        {feature.status === "future" ? (
          <p className="px-6 pb-6 text-xs leading-5 text-muted-foreground">
            This route remains visible so the intended product stays legible while WhatsApp flow and
            messaging foundations are completed first.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
