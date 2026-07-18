import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Braces,
  GitBranch,
  Image as ImageIcon,
  ListTree,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Square,
  UploadCloud,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  createGuidedFlowModel,
  type GuidedFlowModel,
  type GuidedFlowStep,
  type GuidedStepKind,
} from "@/features/connect/flow-manager-ui/guided-flow-model";
import type { BusinessFlowDetails } from "@/features/connect/shared/flow-template-store.server";
import type { FlowValidationIssue } from "@/features/connect/shared/flow-template-types";
import { cn } from "@/lib/utils";

export function GuidedFlowWorkspace({
  details,
  showCanvasTab = true,
}: {
  details: BusinessFlowDetails;
  showCanvasTab?: boolean;
}) {
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [selectedStepId, setSelectedStepId] = useState<string>();
  const [activeTab, setActiveTab] = useState("journey");
  const result = useMemo(
    () => createGuidedFlowModel(details, selectedVersionId),
    [details, selectedVersionId],
  );

  useEffect(() => {
    if (!result.ok) return;
    const model = result.model;
    if (!selectedVersionId || !model.versions.some((version) => version.id === selectedVersionId)) {
      setSelectedVersionId(model.version.id);
    }
    if (!selectedStepId || !model.steps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(model.steps[0]?.id);
    }
  }, [result, selectedStepId, selectedVersionId]);

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
  const step = model.steps.find((item) => item.id === selectedStepId) ?? model.steps[0];

  function explainFuture(feature: string, description: string) {
    toast.info(`${feature} - Future`, { description });
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Canonical WhatsApp flow</div>
          <div className="truncate text-lg font-semibold">{model.flowName}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge tone={model.activeVersionId ? "success" : "warning"}>
              {model.activeVersionId ? "Live version available" : "Draft only"}
            </StatusBadge>
            <span>{model.steps.length} steps</span>
            <span>{model.source.replaceAll("_", " ")}</span>
          </div>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Select value={model.version.id} onValueChange={setSelectedVersionId}>
            <SelectTrigger className="h-9 w-48 max-w-full" aria-label="Flow version">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {model.versions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.status === "DRAFT" ? "Draft" : `Version ${version.version_number}`} -{" "}
                  {version.status.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            data-flow-manager-live-action
            variant="outline"
            size="sm"
            onClick={() =>
              explainFuture(
                "Save draft",
                "Safe Guided editing, conflict handling, and retryable saves are the next work package.",
              )
            }
          >
            <Save className="size-4" /> Save draft <FutureLabel />
          </Button>
          <Button
            data-flow-manager-live-action
            size="sm"
            onClick={() =>
              explainFuture(
                "Publish changes",
                "Publishing remains disabled until Guided mutations and repair validation are complete.",
              )
            }
          >
            Publish changes <FutureLabel />
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
                  explainFuture(
                    "Duplicate flow",
                    "Flow duplication is planned for safe draft editing.",
                  )
                }
              />
              <FutureMenuItem
                label="Export as JSON"
                onSelect={() =>
                  explainFuture("Export flow", "Audited flow exports do not run in this release.")
                }
              />
              <DropdownMenuSeparator />
              <FutureMenuItem
                label="Discard draft"
                destructive
                onSelect={() =>
                  explainFuture(
                    "Discard draft",
                    "Draft restore and conflict safeguards must be complete before discard is enabled.",
                  )
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs className="min-w-0" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger data-flow-manager-live="true" value="journey">
            Guided
          </TabsTrigger>
          {showCanvasTab ? (
            <TabsTrigger
              data-flow-manager-live-action
              value="canvas"
              onClick={() =>
                explainFuture(
                  "Canvas",
                  "Canvas stays available as a preview while Guided becomes the supported editor.",
                )
              }
            >
              Canvas
            </TabsTrigger>
          ) : null}
          <TabsTrigger data-flow-manager-live="true" value="selected">
            Selected Step
          </TabsTrigger>
          <TabsTrigger data-flow-manager-live="true" value="preview">
            Preview
          </TabsTrigger>
          <TabsTrigger data-flow-manager-live="true" value="validation">
            Validation
          </TabsTrigger>
          <TabsTrigger data-flow-manager-live="true" value="advanced">
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journey" className="mt-4">
          <JourneyTab
            model={model}
            selectedId={step?.id}
            onSelect={setSelectedStepId}
            onFuture={explainFuture}
          />
        </TabsContent>
        {showCanvasTab ? (
          <TabsContent value="canvas" className="mt-4">
            <CanvasFuturePanel />
          </TabsContent>
        ) : null}
        <TabsContent value="selected" className="mt-4">
          {step ? (
            <SelectedStepTab step={step} steps={model.steps} onFuture={explainFuture} />
          ) : (
            <WorkspaceState
              icon={<MessageSquare className="size-5" />}
              title="No step selected"
              message="Choose a Guided step to inspect its canonical fields."
            />
          )}
        </TabsContent>
        <TabsContent value="preview" className="mt-4">
          {step ? <PreviewTab step={step} version={model.version.version_number} /> : null}
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
      message="The visual canvas remains visible for later work. Guided is the supported flow-building experience and this preview does not save changes."
    />
  );
}

function JourneyTab({
  model,
  selectedId,
  onSelect,
  onFuture,
}: {
  model: GuidedFlowModel;
  selectedId?: string;
  onSelect: (id: string) => void;
  onFuture: (feature: string, description: string) => void;
}) {
  const selected = model.steps.find((step) => step.id === selectedId) ?? model.steps[0];
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Conversation journey</div>
            <div className="text-xs text-muted-foreground">
              Ordered from the canonical start step; unreachable saved steps remain visible.
            </div>
          </div>
          <Button
            data-flow-manager-live-action
            size="sm"
            variant="outline"
            onClick={() =>
              onFuture(
                "Add next step",
                "Step creation starts after the canonical mapping and preservation gate passes.",
              )
            }
          >
            <Plus className="size-4" /> Add next step <FutureLabel />
          </Button>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start gap-3">
            {model.steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3">
                <StepCard
                  step={step}
                  selected={selected?.id === step.id}
                  onSelect={() => onSelect(step.id)}
                />
                {index < model.steps.length - 1 ? (
                  <ArrowRight className="mt-9 size-4 shrink-0 text-muted-foreground" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{selected.title} routing</CardTitle>
            <CardDescription>
              Every saved option and explicit next destination from this canonical step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {selected.options.map((option) => (
              <RouteRow
                key={option.key}
                label={`Customer chooses: ${option.labelEn}`}
                destination={option.targetTitle}
                warning={option.missingTarget || !option.targetNodeId}
                inactive={!option.active}
              />
            ))}
            {selected.nextSteps.map((next) => (
              <RouteRow
                key={next.id}
                label="Then"
                destination={next.title}
                warning={next.missing}
              />
            ))}
            {!selected.options.length && !selected.nextSteps.length ? (
              <p className="text-sm text-muted-foreground">This step has no saved destination.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StepCard({
  step,
  selected,
  onSelect,
}: {
  step: GuidedFlowStep;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      data-flow-manager-live-action
      type="button"
      onClick={onSelect}
      className={cn(
        "w-64 shrink-0 rounded-lg border bg-card p-3 text-left shadow-sm transition hover:shadow",
        selected && "border-primary ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded bg-muted text-muted-foreground">
          <StepIcon kind={step.kind} />
        </span>
        <span className="text-xs text-muted-foreground">{step.kind}</span>
        <span className="ml-auto">
          <StepStatus step={step} />
        </span>
      </div>
      <div className="mt-2 truncate text-sm font-medium">{step.title}</div>
      <div className="mt-1 line-clamp-2 min-h-8 text-xs text-muted-foreground">{step.preview}</div>
      <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground">{step.id}</div>
    </button>
  );
}

function SelectedStepTab({
  step,
  steps,
  onFuture,
}: {
  step: GuidedFlowStep;
  steps: GuidedFlowStep[];
  onFuture: (feature: string, description: string) => void;
}) {
  const readOnlyFuture = () =>
    onFuture(
      "Guided editing",
      "These are the real saved fields. Safe editing and rejected-save recovery start in work package 2B.",
    );
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Step identity <FutureLabel />
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Admin title">
              <Input value={step.title} readOnly onClick={readOnlyFuture} />
            </Field>
            <Field label="Step type">
              <Select value={step.canonicalType} onValueChange={readOnlyFuture}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={step.canonicalType}>{step.canonicalType}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Stable step ID">
              <Input value={step.id} readOnly className="font-mono" />
            </Field>
            <Field label="Protected backend action">
              <Input value={step.protectedAction ?? "None"} readOnly className="font-mono" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Customer-facing message <FutureLabel />
            </CardTitle>
            <CardDescription>Real copy stored for this canonical step.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Message (EN)">
              <Textarea rows={4} value={step.messages.en} readOnly onClick={readOnlyFuture} />
            </Field>
            <Field label="Message (AR)">
              <Textarea
                rows={4}
                dir="rtl"
                value={step.messages.ar}
                readOnly
                onClick={readOnlyFuture}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  WhatsApp options <FutureLabel />
                </CardTitle>
                <CardDescription>Saved labels and explicit Guided destinations.</CardDescription>
              </div>
              <Button
                data-flow-manager-live-action
                size="sm"
                variant="outline"
                onClick={readOnlyFuture}
              >
                <Plus className="size-4" /> Add WhatsApp option <FutureLabel />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {step.options.length ? (
              step.options.map((option) => (
                <div key={option.key} className="rounded-md border p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Button text (EN)">
                      <Input value={option.labelEn} readOnly onClick={readOnlyFuture} />
                    </Field>
                    <Field label="Button text (AR)">
                      <Input dir="rtl" value={option.labelAr} readOnly onClick={readOnlyFuture} />
                    </Field>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Field label="After customer chooses">
                      <Select value={option.targetNodeId ?? "none"} onValueChange={readOnlyFuture}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No destination</SelectItem>
                          {steps.map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {candidate.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-end gap-2 pb-0.5">
                      <Switch checked={option.active} onCheckedChange={readOnlyFuture} />
                      <span className="text-xs">Active</span>
                    </div>
                  </div>
                  {option.missingTarget ? (
                    <p className="mt-2 text-xs text-destructive">
                      The saved destination is missing.
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">This step has no saved options.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Image / media <FutureLabel />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {step.mediaUrl ? (
              <img
                src={step.mediaUrl}
                alt="Saved flow media"
                className="aspect-video w-full rounded-md border object-contain"
              />
            ) : (
              <div className="grid aspect-video place-items-center rounded-md border-2 border-dashed bg-muted/40 text-xs text-muted-foreground">
                No image attached
              </div>
            )}
            <Button
              data-flow-manager-live-action
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                onFuture(
                  "Upload image",
                  "Tenant media availability and safe Guided saving are not enabled in 2A.",
                )
              }
            >
              <UploadCloud className="size-4" /> Upload image <FutureLabel />
            </Button>
            <Field label="Caption (EN)">
              <Textarea value={step.mediaCaption.en} rows={2} readOnly onClick={readOnlyFuture} />
            </Field>
            <Field label="Caption (AR)">
              <Textarea
                value={step.mediaCaption.ar}
                rows={2}
                dir="rtl"
                readOnly
                onClick={readOnlyFuture}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Routing behavior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>Start step</span>
              <StatusBadge tone={step.isStart ? "success" : "neutral"}>
                {step.isStart ? "Yes" : "No"}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Optional</span>
              <StatusBadge tone={step.optional ? "info" : "neutral"}>
                {step.optional ? "Yes" : "No"}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Destinations</span>
              <span className="tabular-nums">{step.options.length + step.nextSteps.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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
              <CardDescription>Real saved copy for {step.title}.</CardDescription>
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
                {message || "No saved copy for this language."}
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
          <CardTitle className="text-base">What happens next</CardTitle>
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
            Preview reflects saved version {version}. It does not send a customer message.
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
        title="No saved validation issues"
        message="This version does not contain a recorded error or warning. Publishing remains disabled until 2B validates edited Guided state."
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
                    Focus step
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
              Manual / debug tools <FutureLabel />
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
                  onFuture(
                    feature,
                    "This action remains disabled until safe Guided mutations ship.",
                  )
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

function RouteRow({
  label,
  destination,
  warning,
  inactive = false,
}: {
  label: string;
  destination: string;
  warning: boolean;
  inactive?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs">
      <div className="min-w-0">
        <div className="truncate text-muted-foreground">{label}</div>
        <div className={cn("truncate font-medium", warning && "text-destructive")}>
          Then: {destination}
        </div>
      </div>
      {inactive ? <StatusBadge tone="neutral">Off</StatusBadge> : null}
    </div>
  );
}

function StepStatus({ step }: { step: GuidedFlowStep }) {
  if (step.status === "error") {
    return <StatusBadge tone="destructive">{step.issues.length} error</StatusBadge>;
  }
  if (step.status === "warning") {
    return <StatusBadge tone="warning">{step.issues.length} warning</StatusBadge>;
  }
  return <StatusBadge tone="success">OK</StatusBadge>;
}

function StepIcon({ kind }: { kind: GuidedStepKind }) {
  const className = "size-4";
  if (kind === "Image") return <ImageIcon className={className} />;
  if (kind === "Catalog") return <ListTree className={className} />;
  if (kind === "Branch") return <GitBranch className={className} />;
  if (kind === "Handoff") return <User className={className} />;
  if (kind === "End") return <Square className={className} />;
  return <MessageSquare className={className} />;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
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
