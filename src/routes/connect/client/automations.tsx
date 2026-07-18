import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Pause, Play, Plus, RefreshCw, Zap } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import {
  CanvasFuturePanel,
  GuidedFlowWorkspace,
} from "@/features/connect/flow-manager-ui/guided-flow-workspace";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import {
  applyWaDashboardFlowAction,
  getWaDashboardFlow,
  type WaDashboardFlowSnapshot,
} from "@/features/connect/shared/dashboard-client";

export const Route = createFileRoute("/connect/client/automations")({
  head: () => ({ meta: [{ title: "Automations - Client Dashboard" }] }),
  component: ClientAutomations,
});

type AutomationRow = {
  id: string;
  name: string;
  status: "active" | "paused" | "draft";
  trigger: string;
  updated: string;
};

function ClientAutomations() {
  const [activeTab, setActiveTab] = useState("list");
  const flowQuery = useQuery({
    queryKey: ["connect", "guided-flow", "client"],
    queryFn: getWaDashboardFlow,
  });
  const workflows = useMemo(
    () => (flowQuery.data ? toAutomationRows(flowQuery.data) : []),
    [flowQuery.data],
  );

  function explainFuture(feature: string, description: string) {
    toast.info(`${feature} - Future`, { description });
  }

  return (
    <>
      <ClientTopBar
        title="Automations"
        subtitle="Build and inspect the WhatsApp conversation flow in Guided."
        actions={
          <Button
            data-flow-manager-live-action
            onClick={() =>
              explainFuture(
                "New workflow",
                "Flow creation begins after safe Guided draft editing is connected.",
              )
            }
          >
            <Plus className="size-4" /> New workflow <FutureLabel />
          </Button>
        }
      />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Tabs className="min-w-0" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger data-flow-manager-live="true" value="list">
              All workflows
            </TabsTrigger>
            <TabsTrigger data-flow-manager-live="true" value="guided">
              Guided
            </TabsTrigger>
            <TabsTrigger
              data-flow-manager-live-action
              value="canvas"
              onClick={() =>
                explainFuture(
                  "Canvas",
                  "Canvas stays visible for later work while Guided is the supported editor.",
                )
              }
            >
              Canvas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {flowQuery.isLoading ? <WorkflowStateCard message="Loading workflows..." /> : null}
              {flowQuery.error ? (
                <WorkflowStateCard
                  message={flowQuery.error.message}
                  action={
                    <Button
                      data-flow-manager-live-action
                      variant="outline"
                      size="sm"
                      onClick={() => void flowQuery.refetch()}
                    >
                      <RefreshCw className="size-4" /> Retry
                    </Button>
                  }
                />
              ) : null}
              {!flowQuery.isLoading && !flowQuery.error && workflows.length === 0 ? (
                <WorkflowStateCard message="No WhatsApp flow has been created for this workspace yet." />
              ) : null}
              {workflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                        <Zap className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{workflow.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Trigger: {workflow.trigger}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <div className="text-muted-foreground">Run metrics</div>
                      <FutureLabel />
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {workflow.status}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Updated {formatDistanceToNow(workflow.updated)}
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <Button
                        data-flow-manager-live-action
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setActiveTab("guided")}
                      >
                        <FileText className="size-3.5" /> Open Guided
                      </Button>
                      <Button
                        data-flow-manager-live-action
                        size="sm"
                        variant="ghost"
                        aria-label={
                          workflow.status === "active"
                            ? "Pause workflow - Future"
                            : "Resume workflow - Future"
                        }
                        onClick={() =>
                          explainFuture(
                            workflow.status === "active" ? "Pause workflow" : "Resume workflow",
                            "Lifecycle controls need audited flow mutations and are not active in 2A.",
                          )
                        }
                      >
                        {workflow.status === "active" ? (
                          <Pause className="size-3.5" />
                        ) : (
                          <Play className="size-3.5" />
                        )}
                        <FutureLabel />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="guided" className="mt-4">
            {flowQuery.data?.details ? (
              <GuidedFlowWorkspace
                details={flowQuery.data.details}
                showCanvasTab={false}
                onSaveDraft={async ({ flowJson, flowName }) => {
                  const snapshot = await applyWaDashboardFlowAction({
                    action: "save_draft",
                    flowJson,
                    flowName,
                  });
                  await flowQuery.refetch();
                  return snapshot.details;
                }}
              />
            ) : flowQuery.error ? (
              <WorkflowStateCard message={flowQuery.error.message} />
            ) : (
              <WorkflowStateCard message="Loading the real Guided flow..." />
            )}
          </TabsContent>

          <TabsContent value="canvas" className="mt-4">
            <CanvasFuturePanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function WorkflowStateCard({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-muted-foreground">
        <p>{message}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

function toAutomationRows(snapshot: WaDashboardFlowSnapshot): AutomationRow[] {
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
      updated: flow.updated_at,
    },
  ];
}

function FutureLabel() {
  return (
    <span className="rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}
