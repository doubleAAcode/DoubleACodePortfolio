import { createFileRoute } from "@tanstack/react-router";
import { Copy, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CanonicalFlowManagerEditor } from "@/features/connect/flow-manager/canonical-flow-editor";
import {
  applyWaDashboardFlowAction,
  getWaDashboardFlow,
  uploadWaDashboardImage,
  type WaDashboardFlowSnapshot,
} from "@/features/connect/shared/dashboard-client";
import {
  compileVisualFlowToRuntimeFlow,
  getVisualFlow,
  validateVisualFlow,
  type VisualFlowDefinition,
} from "@/features/connect/shared/visual-flow-builder";
import type {
  BusinessFlowDetails,
  BusinessFlowVersionRow,
} from "@/features/connect/shared/flow-template-store.server";

export const Route = createFileRoute("/connect/client/automations/builder")({
  component: ClientFlowBuilderPage,
});

function ClientFlowBuilderPage() {
  const [snapshot, setSnapshot] = useState<WaDashboardFlowSnapshot>();
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [visualFlow, setVisualFlow] = useState<VisualFlowDefinition>();
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [flowName, setFlowName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [savedState, setSavedState] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const applySnapshot = useCallback((data: WaDashboardFlowSnapshot, preferredVersionId = "") => {
    const selected = selectVersion(data.details, preferredVersionId);
    const nextVisualFlow = selected ? getVisualFlow(selected.flow_json) : undefined;
    const nextName =
      selected?.flow_json.name || data.details.flow?.name || "Custom WhatsApp conversation";
    setSnapshot(data);
    setSelectedVersionId(selected?.id ?? "");
    setVisualFlow(nextVisualFlow);
    setSelectedNodeId(nextVisualFlow?.nodes[0]?.id ?? "");
    setFlowName(nextName);
    setSavedState(serializeEditorState(nextVisualFlow, nextName));
    setTemplateId((current) =>
      data.templates.some((template) => template.id === current)
        ? current
        : data.templates[0]?.id || "",
    );
  }, []);

  const load = useCallback(async () => {
    setBusy("load");
    setError("");
    try {
      applySnapshot(await getWaDashboardFlow(), selectedVersionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the flow builder.");
    } finally {
      setBusy("");
    }
  }, [applySnapshot, selectedVersionId]);

  useEffect(() => {
    let mounted = true;
    setBusy("load");
    getWaDashboardFlow()
      .then((data) => {
        if (mounted) applySnapshot(data);
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Could not load the flow builder.");
        }
      })
      .finally(() => {
        if (mounted) setBusy("");
      });
    return () => {
      mounted = false;
    };
  }, [applySnapshot]);

  const selectedVersion = snapshot ? selectVersion(snapshot.details, selectedVersionId) : undefined;
  const validation = useMemo(
    () => (visualFlow ? validateVisualFlow(visualFlow) : { ok: false, issues: [] }),
    [visualFlow],
  );
  const dirty = serializeEditorState(visualFlow, flowName) !== savedState;

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flow action failed.");
    } finally {
      setBusy("");
    }
  }

  async function saveDraft() {
    if (!visualFlow || !selectedVersion) throw new Error("No editable flow is loaded.");
    if (selectedVersion.status !== "DRAFT") throw new Error("Published versions are read-only.");
    const cleanName = flowName.trim() || "Custom WhatsApp conversation";
    const namedVisualFlow = {
      ...visualFlow,
      metadata: { ...visualFlow.metadata, name: cleanName },
    };
    const compiled = compileVisualFlowToRuntimeFlow(namedVisualFlow, selectedVersion.flow_json);
    if (!compiled.ok || !compiled.flow) {
      throw new Error(validationMessage(compiled.validation.issues));
    }
    const data = await applyWaDashboardFlowAction({
      action: "save_draft",
      flowName: cleanName,
      flowJson: {
        ...compiled.flow,
        name: cleanName,
        visualFlow: namedVisualFlow,
      },
    });
    const draftId = data.details.versions.find((version) => version.status === "DRAFT")?.id ?? "";
    applySnapshot(data, draftId);
    return draftId;
  }

  async function publish() {
    const draftId = await saveDraft();
    if (!draftId) throw new Error("The draft could not be found after saving.");
    const data = await applyWaDashboardFlowAction({
      action: "publish_version",
      versionId: draftId,
    });
    applySnapshot(data, data.details.activeVersion?.id);
  }

  async function cloneTemplate() {
    if (!templateId) throw new Error("Choose a published template first.");
    const data = await applyWaDashboardFlowAction({ action: "clone_template", templateId });
    const draftId = data.details.versions.find((version) => version.status === "DRAFT")?.id;
    applySnapshot(data, draftId);
  }

  function chooseVersion(versionId: string) {
    if (!snapshot || dirty) return;
    const selected = selectVersion(snapshot.details, versionId);
    const nextVisualFlow = selected ? getVisualFlow(selected.flow_json) : undefined;
    const nextName =
      selected?.flow_json.name || snapshot.details.flow?.name || "Custom WhatsApp conversation";
    setSelectedVersionId(selected?.id ?? "");
    setVisualFlow(nextVisualFlow);
    setSelectedNodeId(nextVisualFlow?.nodes[0]?.id ?? "");
    setFlowName(nextName);
    setSavedState(serializeEditorState(nextVisualFlow, nextName));
  }

  if (!snapshot || busy === "load") {
    return (
      <div className="grid min-h-80 place-items-center text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <RefreshCw className="size-4 animate-spin" />
          Loading flow manager...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!visualFlow ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Start from an approved template</CardTitle>
            <CardDescription>
              The selected Flow Manager template becomes a real editable draft for this business.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="min-w-0 flex-1">
                <SelectValue placeholder="Choose template" />
              </SelectTrigger>
              <SelectContent>
                {snapshot.templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!templateId || Boolean(busy)}
              onClick={() => void run("clone", cloneTemplate)}
            >
              <Copy className="size-4" />
              {busy === "clone" ? "Creating..." : "Use template"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <CanonicalFlowManagerEditor
          businessName={snapshot.catalog.business.name}
          flow={visualFlow}
          validation={validation}
          selectedNodeId={selectedNodeId}
          selectedVersionId={selectedVersionId}
          versions={snapshot.details.versions}
          flowName={flowName}
          busy={busy}
          dirty={dirty}
          onChange={setVisualFlow}
          onFlowNameChange={setFlowName}
          onSelectNode={setSelectedNodeId}
          onSelectVersion={chooseVersion}
          onSave={() => void run("save", async () => void (await saveDraft()))}
          onPublish={() => void run("publish", publish)}
          onUploadImage={async (file) => (await uploadWaDashboardImage(file)).url}
        />
      )}
    </div>
  );
}

function selectVersion(
  details: BusinessFlowDetails,
  versionId = "",
): BusinessFlowVersionRow | undefined {
  return (
    details.versions.find((version) => version.id === versionId) ??
    details.versions.find((version) => version.status === "DRAFT") ??
    details.activeVersion ??
    details.versions[0]
  );
}

function serializeEditorState(flow: VisualFlowDefinition | undefined, name: string) {
  return JSON.stringify({ flow, name });
}

function validationMessage(issues: Array<{ message: string }>) {
  if (!issues.length) return "The flow could not be compiled.";
  return `Fix these flow errors before saving:\n${issues
    .slice(0, 8)
    .map((issue, index) => `${index + 1}. ${issue.message}`)
    .join("\n")}`;
}
