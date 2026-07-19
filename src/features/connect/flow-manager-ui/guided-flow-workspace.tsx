import {
  AlertCircle,
  AlertTriangle,
  Braces,
  Copy,
  GitBranch,
  Loader2,
  MoreHorizontal,
  Redo2,
  RefreshCw,
  Save,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  createGuidedDraftFlow,
  serializeGuidedDocument,
  updateGuidedNode,
  updateGuidedOption,
} from "@/features/connect/flow-manager-ui/guided-flow-draft";
import { GuidedFlowEditor } from "@/features/connect/flow-manager-ui/guided-flow-editor";
import {
  createGuidedFlowModel,
  type GuidedFlowModel,
  type GuidedFlowStep,
} from "@/features/connect/flow-manager-ui/guided-flow-model";
import type { CanonicalFlowDocument } from "@/features/connect/shared/flow-document";
import { FLOW_DRAFT_CONFLICT_CODE } from "@/features/connect/shared/flow-draft-conflict";
import type { BusinessFlowDetails } from "@/features/connect/shared/flow-template-store.server";
import type {
  FlowDefinition,
  FlowValidationIssue,
} from "@/features/connect/shared/flow-template-types";
import {
  flowDiagnosticsToLegacyResult,
  validateFlow,
} from "@/features/connect/shared/flow-validation";
import { cn } from "@/lib/utils";

type SaveDraftInput = {
  flowJson: FlowDefinition;
  flowName: string;
  versionId: string;
  expectedRevision: number;
};

export function GuidedFlowWorkspace({
  details,
  showCanvasTab = true,
  onSaveDraft,
}: {
  details: BusinessFlowDetails;
  showCanvasTab?: boolean;
  onSaveDraft?: (input: SaveDraftInput) => Promise<BusinessFlowDetails>;
}) {
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [selectedStepId, setSelectedStepId] = useState<string>();
  const [activeTab, setActiveTab] = useState("guided");
  const [historyVersionId, setHistoryVersionId] = useState<string>();
  const [history, setHistory] = useState<CanonicalFlowDocument[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveConflict, setSaveConflict] = useState<string>();

  const baseResult = useMemo(
    () => createGuidedFlowModel(details, selectedVersionId),
    [details, selectedVersionId],
  );
  const baseDocumentKey = baseResult.ok
    ? `${baseResult.model.version.id}:${serializeGuidedDocument(baseResult.model.document)}`
    : "";

  useEffect(() => {
    if (!baseResult.ok) return;
    const document = structuredClone(baseResult.model.document);
    setSelectedVersionId(baseResult.model.version.id);
    setHistoryVersionId(baseResult.model.version.id);
    setHistory([document]);
    setHistoryIndex(0);
    setSavedSnapshot(serializeGuidedDocument(document));
    setSaveConflict(undefined);
    setSelectedStepId((current) =>
      current && baseResult.model.steps.some((step) => step.id === current)
        ? current
        : baseResult.model.steps[0]?.id,
    );
  }, [baseDocumentKey, baseResult]);

  const baseModel = baseResult.ok ? baseResult.model : undefined;
  const workingDocument =
    baseModel && historyVersionId === baseModel.version.id
      ? (history[historyIndex] ?? baseModel.document)
      : baseModel?.document;
  const result = useMemo(() => {
    if (!baseResult.ok || !workingDocument) return baseResult;
    const baseVersion = baseResult.model.version;
    const flowJson = createGuidedDraftFlow(baseVersion.flow_json, workingDocument);
    const validation = flowDiagnosticsToLegacyResult(
      validateFlow(workingDocument, { mode: "draft" }).diagnostics,
    );
    const workingVersion = {
      ...baseVersion,
      flow_json: flowJson,
      validation_result: validation,
    };
    const workingDetails: BusinessFlowDetails = {
      ...details,
      versions: details.versions.map((version) =>
        version.id === workingVersion.id ? workingVersion : version,
      ),
      activeVersion:
        details.activeVersion?.id === workingVersion.id ? workingVersion : details.activeVersion,
    };
    return createGuidedFlowModel(workingDetails, workingVersion.id);
  }, [baseResult, details, workingDocument]);

  const stateModel = result.ok ? result.model : undefined;
  const stateEditable = stateModel?.version.status === "DRAFT" && Boolean(onSaveDraft);
  const stateSnapshot = stateModel ? serializeGuidedDocument(stateModel.document) : "";
  const stateDirty = Boolean(stateEditable && stateSnapshot !== savedSnapshot);

  useEffect(() => {
    if (!stateDirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [stateDirty]);

  if (!result.ok) {
    return (
      <WorkspaceState
        icon={<AlertCircle className="size-5 text-destructive" />}
        title="Guided cannot open this flow"
        message={result.message}
        details={result.diagnostics.map((diagnostic) => diagnostic.message)}
      />
    );
  }

  const model = result.model;
  const selectedStep = model.steps.find((step) => step.id === selectedStepId) ?? model.steps[0];
  const editable = stateEditable;
  const currentSnapshot = stateSnapshot;
  const dirty = stateDirty;
  const canUndo = historyVersionId === model.version.id && historyIndex > 0;
  const canRedo = historyVersionId === model.version.id && historyIndex < history.length - 1;

  function explainFuture(feature: string, description: string) {
    toast.info(`${feature} - Future`, { description });
  }

  function commitDocument(update: (document: CanonicalFlowDocument) => CanonicalFlowDocument) {
    if (!editable) {
      explainFuture(
        "Read-only version",
        "Choose the Draft version to edit. Published versions remain immutable.",
      );
      return;
    }
    const next = update(structuredClone(model.document));
    if (serializeGuidedDocument(next) === currentSnapshot) return;
    const nextHistory = [...history.slice(0, historyIndex + 1), next].slice(-50);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  }

  async function saveDraft() {
    if (!editable || !onSaveDraft) {
      explainFuture(
        "Save draft",
        "Choose the Draft version to edit. Published versions remain immutable.",
      );
      return;
    }
    if (!dirty) {
      toast.info("Draft is already saved");
      return;
    }
    setSaving(true);
    try {
      const saved = await onSaveDraft({
        flowJson: createGuidedDraftFlow(model.version.flow_json, model.document),
        flowName: model.flowName,
        versionId: model.version.id,
        expectedRevision: model.version.revision,
      });
      const savedResult = createGuidedFlowModel(saved);
      if (!savedResult.ok) throw new Error(savedResult.message);
      const document = structuredClone(savedResult.model.document);
      setSelectedVersionId(savedResult.model.version.id);
      setHistoryVersionId(savedResult.model.version.id);
      setHistory([document]);
      setHistoryIndex(0);
      setSavedSnapshot(serializeGuidedDocument(document));
      setSaveConflict(undefined);
      toast.success("Draft saved");
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      const message =
        error instanceof Error ? error.message : "Try again without losing your work.";
      if (code === FLOW_DRAFT_CONFLICT_CODE) {
        setSaveConflict(message);
        toast.error("A newer draft is already saved", { description: message });
      } else {
        toast.error("Draft was not saved", { description: message });
      }
    } finally {
      setSaving(false);
    }
  }

  function changeVersion(versionId: string) {
    if (dirty) {
      toast.error("Save or undo your changes before switching versions.");
      return;
    }
    setSelectedVersionId(versionId);
  }

  async function copyLocalDraft() {
    try {
      const localFlow = createGuidedDraftFlow(model.version.flow_json, model.document);
      await navigator.clipboard.writeText(JSON.stringify(localFlow, null, 2));
      toast.success("Local draft copied");
    } catch {
      toast.error("Local draft could not be copied");
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">WhatsApp conversation flow</div>
          <div className="truncate text-lg font-semibold">{model.flowName}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge tone={model.activeVersionId ? "success" : "warning"}>
              {model.activeVersionId ? "Live version available" : "Draft only"}
            </StatusBadge>
            <span>{model.steps.length} steps</span>
            {dirty ? <StatusBadge tone="warning">Unsaved changes</StatusBadge> : null}
            {!editable ? <StatusBadge tone="neutral">Read only</StatusBadge> : null}
          </div>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Select value={model.version.id} onValueChange={changeVersion}>
            <SelectTrigger className="h-9 w-48 max-w-full" aria-label="Flow version">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {model.versions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.status === "DRAFT" ? "Draft" : "Published"} v{version.version_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-md border bg-background p-0.5">
            <Button
              data-flow-manager-live-action
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Undo"
              title="Undo"
              disabled={!canUndo || saving}
              onClick={() => setHistoryIndex((index) => index - 1)}
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              data-flow-manager-live-action
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Redo"
              title="Redo"
              disabled={!canRedo || saving}
              onClick={() => setHistoryIndex((index) => index + 1)}
            >
              <Redo2 className="size-4" />
            </Button>
          </div>
          <Button
            data-flow-manager-live-action
            variant="outline"
            size="sm"
            disabled={saving || Boolean(saveConflict)}
            onClick={() => void saveDraft()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Saving..." : "Save draft"}
          </Button>
          <Button
            data-flow-manager-live-action
            size="sm"
            onClick={() =>
              explainFuture(
                "Publish changes",
                "Publishing follows safe draft editing, repair validation, and immutable history in 2C.",
              )
            }
          >
            Publish <FutureLabel />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More flow actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <FutureMenuItem
                label="Duplicate flow"
                onSelect={() =>
                  explainFuture("Duplicate flow", "Duplication ships with safe step creation.")
                }
              />
              <FutureMenuItem
                label="Export as JSON"
                onSelect={() => explainFuture("Export flow", "Audited flow exports remain Future.")}
              />
              <DropdownMenuSeparator />
              <FutureMenuItem
                label="Discard draft"
                destructive
                onSelect={() =>
                  explainFuture(
                    "Discard draft",
                    "Restore safeguards must be complete before discard is enabled.",
                  )
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {saveConflict ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold">Draft changed in another session</div>
              <p className="mt-0.5 text-sm">
                Your save was rejected and your local edits remain open. Copy them before loading
                the latest server draft.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void copyLocalDraft()}>
              <Copy className="size-4" /> Copy local draft
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RefreshCw className="size-4" /> Reload latest
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard local unsaved edits?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Reloading opens the newest server draft and permanently removes the unsaved
                    edits currently shown in this tab.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep editing</AlertDialogCancel>
                  <AlertDialogAction onClick={() => window.location.reload()}>
                    Reload latest
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}

      <Tabs className="min-w-0" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger data-flow-manager-live="true" value="guided">
            Guided editor
          </TabsTrigger>
          <TabsTrigger data-flow-manager-live="true" value="selected">
            Selected step
          </TabsTrigger>
          <TabsTrigger data-flow-manager-live="true" value="preview">
            Preview
          </TabsTrigger>
          <TabsTrigger data-flow-manager-live="true" value="validation">
            Problems {model.diagnostics.length ? `(${model.diagnostics.length})` : ""}
          </TabsTrigger>
          <TabsTrigger data-flow-manager-live="true" value="advanced">
            Advanced
          </TabsTrigger>
          {showCanvasTab ? (
            <TabsTrigger
              value="canvas"
              aria-label="Canvas - Future"
              onClick={() =>
                explainFuture(
                  "Canvas",
                  "Canvas remains a visible preview. Guided editor is the supported builder.",
                )
              }
            >
              Canvas <FutureLabel />
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="guided" className="mt-4">
          <GuidedFlowEditor
            model={model}
            selectedId={selectedStep?.id}
            editable={editable}
            onSelect={setSelectedStepId}
            onUpdateNode={(nodeId, update) =>
              commitDocument((document) => updateGuidedNode(document, nodeId, update))
            }
            onUpdateOption={(nodeId, optionKey, update) =>
              commitDocument((document) => updateGuidedOption(document, nodeId, optionKey, update))
            }
            onFuture={explainFuture}
            onEdit={(nodeId) => {
              setSelectedStepId(nodeId);
              setActiveTab("selected");
            }}
          />
        </TabsContent>
        <TabsContent value="selected" className="mt-4">
          <GuidedFlowEditor
            view="selected"
            model={model}
            selectedId={selectedStep?.id}
            editable={editable}
            onSelect={setSelectedStepId}
            onUpdateNode={(nodeId, update) =>
              commitDocument((document) => updateGuidedNode(document, nodeId, update))
            }
            onUpdateOption={(nodeId, optionKey, update) =>
              commitDocument((document) => updateGuidedOption(document, nodeId, optionKey, update))
            }
            onFuture={explainFuture}
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-4">
          {selectedStep ? (
            <PreviewTab step={selectedStep} version={model.version.version_number} />
          ) : null}
        </TabsContent>
        <TabsContent value="validation" className="mt-4">
          <ValidationTab
            diagnostics={model.diagnostics}
            steps={model.steps}
            onFocus={(nodeId) => {
              setSelectedStepId(nodeId);
              setActiveTab("selected");
            }}
          />
        </TabsContent>
        <TabsContent value="advanced" className="mt-4">
          <AdvancedTab model={model} onFuture={explainFuture} />
        </TabsContent>
        {showCanvasTab ? (
          <TabsContent value="canvas" className="mt-4">
            <CanvasFuturePanel />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

export function GuidedFlowLoading({ message = "Loading the real flow..." }: { message?: string }) {
  return (
    <WorkspaceState
      icon={<Loader2 className="size-5 animate-spin" />}
      title="Loading Guided"
      message={message}
    />
  );
}

export function GuidedFlowError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <WorkspaceState
      icon={<AlertCircle className="size-5 text-destructive" />}
      title="Guided could not load"
      message={message}
      action={
        <Button data-flow-manager-live-action variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" /> Retry
        </Button>
      }
    />
  );
}

export function CanvasFuturePanel() {
  return (
    <WorkspaceState
      icon={<GitBranch className="size-5 text-amber-700" />}
      title="Canvas - Future"
      message="Canvas remains visible for later work. Guided editor is the supported flow-building experience and Canvas does not save changes."
    />
  );
}

function PreviewTab({ step, version }: { step: GuidedFlowStep; version: number }) {
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const message = step.messages[language] || step.labels[language] || step.preview;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">WhatsApp preview</CardTitle>
              <CardDescription>Saved draft appearance for {step.title}.</CardDescription>
            </div>
            <div className="flex gap-1 rounded-md border p-0.5 text-xs">
              {(["en", "ar"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLanguage(value)}
                  className={cn(
                    "rounded px-2 py-1 uppercase",
                    language === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            dir={language === "ar" ? "rtl" : "ltr"}
            className="mx-auto max-w-md rounded-lg bg-[#e5ddd5] p-4"
          >
            <div className="max-w-[85%] rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              {step.mediaUrl ? (
                <img
                  src={step.mediaUrl}
                  alt="Saved flow media preview"
                  className="mb-2 aspect-video w-full rounded object-contain"
                />
              ) : null}
              <div className="whitespace-pre-wrap">
                {message || "No copy is set for this language."}
              </div>
              {step.options.length ? (
                <div className="mt-2 space-y-1 border-t pt-2">
                  {step.options
                    .filter((option) => option.active)
                    .map((option) => (
                      <div
                        key={option.key}
                        className="rounded border py-1 text-center text-xs text-primary"
                      >
                        {language === "ar" ? option.labelAr || option.labelEn : option.labelEn}
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next destinations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            ...step.options.map((option) => option.targetTitle),
            ...step.nextSteps.map((next) => next.title),
          ].map((destination, index) => (
            <div key={`${destination}-${index}`} className="rounded-md border bg-muted/40 p-3">
              {destination}
            </div>
          ))}
          {!step.options.length && !step.nextSteps.length ? (
            <p className="text-muted-foreground">No next destination is saved.</p>
          ) : null}
          <div className="pt-2 text-xs text-muted-foreground">
            Preview reflects version {version}. It does not send a customer message.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ValidationTab({
  diagnostics,
  steps,
  onFocus,
}: {
  diagnostics: FlowValidationIssue[];
  steps: GuidedFlowStep[];
  onFocus: (nodeId: string) => void;
}) {
  if (!diagnostics.length) {
    return (
      <WorkspaceState
        icon={<AlertCircle className="size-5 text-emerald-700" />}
        title="No draft problems"
        message="The current Guided draft has no recorded error or warning. Publishing remains deferred to 2C."
      />
    );
  }
  return (
    <div className="space-y-3">
      {diagnostics.map((diagnostic, index) => {
        const step = diagnostic.nodeId
          ? steps.find((candidate) => candidate.id === diagnostic.nodeId)
          : undefined;
        const destructive = diagnostic.severity === "ERROR";
        return (
          <Card key={`${diagnostic.code}-${diagnostic.nodeId ?? index}`}>
            <CardContent className="p-4">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <div
                  className={cn(
                    "grid size-8 place-items-center rounded-md",
                    destructive
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/15 text-warning-foreground",
                  )}
                >
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={destructive ? "destructive" : "warning"}>
                      {destructive ? "Error" : "Warning"}
                    </StatusBadge>
                    <span className="text-sm font-medium">{step?.title ?? "Flow"}</span>
                  </div>
                  <p className="mt-1 text-sm">{diagnostic.message}</p>
                  {diagnostic.suggestedFix ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Suggested fix: {diagnostic.suggestedFix}
                    </p>
                  ) : null}
                </div>
                {diagnostic.nodeId ? (
                  <Button
                    data-flow-manager-live-action
                    className="col-start-2 sm:col-start-auto"
                    size="sm"
                    variant="outline"
                    onClick={() => onFocus(diagnostic.nodeId!)}
                  >
                    Open step
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AdvancedTab({
  model,
  onFuture,
}: {
  model: GuidedFlowModel;
  onFuture: (feature: string, description: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Canonical JSON - version {model.version.version_number}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[32rem] overflow-auto rounded-md bg-muted/60 p-3 font-mono text-xs">
            {JSON.stringify(model.document, null, 2)}
          </pre>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Runtime details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Schema" value={`v${model.document.schemaVersion}`} />
            <DetailRow label="Source" value={model.source} />
            <DetailRow label="Stable node IDs" value={String(model.document.nodes.length)} />
            <DetailRow label="Edges" value={String(model.document.edges.length)} />
            <DetailRow label="Start ID" value={model.document.startNodeId ?? "Not set"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Manual tools <FutureLabel />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              ["Force-recompile draft", "Recompilation"],
              ["Export JSON snapshot", "JSON export"],
              ["Reset draft to live", "Draft reset"],
            ].map(([label, feature]) => (
              <Button
                data-flow-manager-live-action
                key={label}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() =>
                  onFuture(feature, "This action remains disabled until safe restore ships.")
                }
              >
                <Braces className="size-4" /> {label} <FutureLabel />
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] break-words text-right font-mono text-xs">{value}</span>
    </div>
  );
}

function WorkspaceState({
  icon,
  title,
  message,
  details = [],
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  details?: string[];
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-lg border border-dashed bg-card p-6 text-center">
      <div className="max-w-lg">
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        {details.length ? (
          <ul className="mt-3 space-y-1 text-left text-xs text-muted-foreground">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

function FutureMenuItem({
  label,
  destructive = false,
  onSelect,
}: {
  label: string;
  destructive?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      data-flow-manager-live-action
      className={destructive ? "text-destructive" : undefined}
      onSelect={onSelect}
    >
      {label}
      <span className="ml-auto">
        <FutureLabel />
      </span>
    </DropdownMenuItem>
  );
}

function FutureLabel() {
  return (
    <span className="rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}
