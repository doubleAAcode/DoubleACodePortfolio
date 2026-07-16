import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  GitBranch,
  Plus,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-5 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4" />
          <div>
            <div className="font-semibold">Automations could not be loaded</div>
            <p className="mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) return <p className="text-sm text-muted-foreground">Loading automations...</p>;

  const { details, templates, catalog } = snapshot;
  const draft = details.versions.find((version) => version.status === "DRAFT");
  const live = details.activeVersion;
  const current = draft ?? live;
  const validation = current?.validation_result;

  return (
    <Tabs defaultValue="workflows">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="workflows">All workflows</TabsTrigger>
          <TabsTrigger value="templates">Approved starters</TabsTrigger>
        </TabsList>
        <Button asChild size="sm">
          <a href="/connect/client/automations/builder">
            <Plus className="size-4" />
            Open builder
          </a>
        </Button>
      </div>

      <TabsContent value="workflows" className="mt-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="cursor-pointer transition hover:shadow-md lg:col-span-2">
            <a href="/connect/client/automations/builder" className="block">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Zap className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold">
                        {details.flow?.name || "WhatsApp conversation"}
                      </div>
                      <Badge variant={live ? "default" : "secondary"}>
                        {live ? "Active" : "Draft"}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Trigger: incoming WhatsApp conversation
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric label="Live version" value={live ? `v${live.version_number}` : "None"} />
                  <Metric
                    label="Draft version"
                    value={draft ? `v${draft.version_number}` : "None"}
                  />
                  <Metric label="Saved versions" value={String(details.versions.length)} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    {validation?.ok ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="size-3.5 text-amber-600" />
                    )}
                    {validation?.ok
                      ? "Current validation passes"
                      : `${validation?.issues.length ?? 0} validation issue(s)`}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    Open flow <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </CardContent>
            </a>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Runtime boundary</CardTitle>
              <CardDescription>What this workflow controls.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <GitBranch className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Messages, menus, questions, routes, and guarded commerce steps.</span>
              </div>
              <div className="flex gap-2 text-muted-foreground">
                <FileText className="mt-0.5 size-4 shrink-0" />
                <span>
                  Prices, inventory, totals, and order transitions remain server-controlled.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="templates" className="mt-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge variant="secondary" className="text-[9px] uppercase">
                    {template.category.replaceAll("_", " ")}
                  </Badge>
                </div>
                <CardDescription>
                  {template.description || "Reusable deterministic WhatsApp flow."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href="/connect/client/automations/builder">Use in {catalog.business.name}</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/25 px-3 py-2">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
