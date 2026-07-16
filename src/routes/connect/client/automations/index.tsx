import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, CircleAlert, GitBranch, History } from "lucide-react";
import { useEffect, useState } from "react";

import { FeatureStatusBadge, FeatureStatusNotice } from "@/features/connect/shell/feature-status";
import {
  getWaDashboardFlow,
  type WaDashboardFlowSnapshot,
} from "@/features/connect/shared/dashboard-client";

export const Route = createFileRoute("/connect/client/automations/")({
  component: ClientAutomationsPage,
});

function ClientAutomationsPage() {
  const [snapshot, setSnapshot] = useState<WaDashboardFlowSnapshot>();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getWaDashboardFlow()
      .then((data) => {
        if (mounted) setSnapshot(data);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Could not load automations.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <section className="border border-destructive/35 bg-destructive/10 p-5 text-sm text-destructive">
        <div className="flex items-center gap-2 font-semibold">
          <CircleAlert className="size-4" />
          Automations could not be loaded
        </div>
        <p className="mt-2 text-destructive/85">{error}</p>
      </section>
    );
  }

  if (!snapshot) return <p className="text-sm text-muted-foreground">Loading automations...</p>;

  const { details, templates, catalog } = snapshot;
  const draft = details.versions.find((version) => version.status === "DRAFT");
  const live = details.activeVersion;
  const validation = draft?.validation_result ?? live?.validation_result;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">Automations</h1>
            <FeatureStatusBadge status="building" />
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Build the deterministic WhatsApp conversation used by {catalog.business.name}. Drafts
            and published versions use the existing protected flow engine.
          </p>
        </div>
        <a href="/connect/client/automations/builder" className="studio-button-primary w-fit">
          <GitBranch className="size-4" />
          Open flow builder
          <ArrowRight className="size-4" />
        </a>
      </header>

      <FeatureStatusNotice status="building" />

      <section className="grid gap-3 md:grid-cols-3">
        <FlowMetric
          icon={CheckCircle2}
          label="Published version"
          value={live ? `v${live.version_number}` : "None"}
          detail={
            live?.published_at
              ? `Published ${formatDate(live.published_at)}`
              : "No customer-facing flow is live"
          }
        />
        <FlowMetric
          icon={GitBranch}
          label="Saved draft"
          value={draft ? `v${draft.version_number}` : "None"}
          detail={draft ? "Editable business draft" : "Open the builder to create a draft"}
        />
        <FlowMetric
          icon={History}
          label="Version history"
          value={String(details.versions.length)}
          detail={
            validation?.ok
              ? "Current validation passes"
              : `${validation?.issues.length ?? 0} validation issue(s)`
          }
        />
      </section>

      <section>
        <div>
          <h2 className="font-display text-xl font-semibold">Approved starters</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Published admin templates available to this business.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-md border border-border bg-surface/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{template.name}</div>
                <span className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {template.category.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {template.description || "Reusable deterministic WhatsApp flow."}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FlowMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof GitBranch;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface/45 p-4">
      <Icon className="size-4 text-primary" />
      <div className="mt-4 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm font-medium">{label}</div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
