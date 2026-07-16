import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { FileText, Pause, Play, Plus, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { WorkflowCanvas } from "@/features/connect/flow-manager-ui/components/workflow-canvas";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import {
  automations as previewAutomations,
  type Automation,
} from "@/features/connect/flow-manager-ui/preview-data/mock-client";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";
import {
  getWaDashboardFlow,
  type WaDashboardFlowSnapshot,
} from "@/features/connect/shared/dashboard-client";

export const Route = createFileRoute("/connect/client/automations")({
  head: () => ({ meta: [{ title: "Automations - Client Dashboard" }] }),
  component: ClientAutomations,
});

function ClientAutomations() {
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const localPreview = import.meta.env.DEV && new URLSearchParams(search).get("preview") === "1";
  const [workflows, setWorkflows] = useState<Automation[]>(localPreview ? previewAutomations : []);
  const [selectedId, setSelectedId] = useState(localPreview ? previewAutomations[1].id : "");
  const [activeTab, setActiveTab] = useState("list");
  const [loading, setLoading] = useState(!localPreview);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (localPreview) {
      setWorkflows(previewAutomations);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError("");
    getWaDashboardFlow()
      .then((snapshot) => {
        if (!active) return;
        setWorkflows(toAutomationRows(snapshot));
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Could not load workflows.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [localPreview]);

  useEffect(() => {
    if (workflows.length === 0) {
      setSelectedId("");
      return;
    }
    if (!workflows.some((workflow) => workflow.id === selectedId)) {
      setSelectedId(workflows[0].id);
    }
  }, [selectedId, workflows]);

  const selected = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedId) ?? workflows[0],
    [selectedId, workflows],
  );

  return (
    <>
      <ClientTopBar
        title="Automations"
        subtitle={"Workflows that run in the background \u2014 assign, tag, notify, escalate."}
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            New workflow
          </Button>
        }
      />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Tabs className="min-w-0" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="list">All workflows</TabsTrigger>
            <TabsTrigger value="canvas" disabled={!selected}>
              Canvas
              {selected ? ` \u2014 ${selected.name.slice(0, 40)}\u2026` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {loading ? <WorkflowStateCard message="Loading workflows..." /> : null}
              {!loading && loadError ? <WorkflowStateCard message={loadError} /> : null}
              {!loading && !loadError && workflows.length === 0 ? (
                <WorkflowStateCard message="No workflow has been created for this workspace yet." />
              ) : null}
              {workflows.map((workflow) => {
                const selectedWorkflow = workflow.id === selected?.id;
                return (
                  <Card
                    key={workflow.id}
                    className={`cursor-pointer transition hover:shadow-md ${
                      selectedWorkflow ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedId(workflow.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-semibold">{workflow.name}</div>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Trigger: {workflow.trigger}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <div className="text-muted-foreground">
                          <span className="font-medium tabular-nums text-foreground">
                            {workflow.runs30d.toLocaleString()}
                          </span>{" "}
                          runs {"\u00b7"} {workflow.successRate}% success
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            workflow.status === "active"
                              ? "bg-emerald-500/10 text-emerald-700"
                              : workflow.status === "paused"
                                ? "bg-amber-500/10 text-amber-700"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {workflow.status}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Updated {formatDistanceToNow(workflow.updated)}
                      </div>
                      <div className="mt-3 flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(workflow.id);
                            setActiveTab("canvas");
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" /> Open
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={
                            workflow.status === "active" ? "Pause workflow" : "Resume workflow"
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            toast(workflow.status === "active" ? "Paused" : "Resumed");
                          }}
                        >
                          {workflow.status === "active" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="canvas" className="mt-4 space-y-3">
            {selected ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{selected.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Drag nodes to reposition {"\u00b7"} connect handles to add edges {"\u00b7"}
                      click a node to configure.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Test run
                    </Button>
                    <Button size="sm" onClick={() => toast.success("Workflow saved")}>
                      Save
                    </Button>
                  </div>
                </div>
                <WorkflowCanvas />
              </>
            ) : (
              <WorkflowStateCard message="Choose or create a workflow before opening the canvas." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function WorkflowStateCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}

function toAutomationRows(snapshot: WaDashboardFlowSnapshot): Automation[] {
  const flow = snapshot.details.flow;
  if (!flow) return [];

  const currentVersion =
    snapshot.details.versions.find((version) => version.status === "DRAFT") ??
    snapshot.details.activeVersion ??
    snapshot.details.versions[0];
  const startNode = currentVersion?.flow_json.nodes.find(
    (node) => node.id === currentVersion.flow_json.startNodeId,
  );

  return [
    {
      id: flow.id,
      name: flow.name,
      status:
        flow.status === "ARCHIVED" ? "paused" : snapshot.details.activeVersion ? "active" : "draft",
      trigger: startNode ? startNode.type.replaceAll("_", " ").toLowerCase() : "WhatsApp message",
      runs30d: 0,
      successRate: 0,
      updated: flow.updated_at,
    },
  ];
}
