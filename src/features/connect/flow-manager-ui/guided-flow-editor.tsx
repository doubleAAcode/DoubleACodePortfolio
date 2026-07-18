import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  GitBranch,
  Image as ImageIcon,
  ListTree,
  MessageSquare,
  Plus,
  Search,
  Square,
  Trash2,
  UploadCloud,
  User,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import type {
  GuidedFlowModel,
  GuidedFlowStep,
  GuidedStepKind,
} from "@/features/connect/flow-manager-ui/guided-flow-model";
import type { CanonicalFlowNode } from "@/features/connect/shared/flow-document";
import type { FlowNodeOption } from "@/features/connect/shared/flow-template-types";
import { cn } from "@/lib/utils";

export function GuidedFlowEditor({
  model,
  selectedId,
  editable,
  onSelect,
  onUpdateNode,
  onUpdateOption,
  onFuture,
}: {
  model: GuidedFlowModel;
  selectedId?: string;
  editable: boolean;
  onSelect: (id: string) => void;
  onUpdateNode: (nodeId: string, update: (node: CanonicalFlowNode) => CanonicalFlowNode) => void;
  onUpdateOption: (
    nodeId: string,
    optionKey: string,
    update: (option: FlowNodeOption) => FlowNodeOption,
  ) => void;
  onFuture: (feature: string, description: string) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = model.steps.find((step) => step.id === selectedId) ?? model.steps[0];
  const node = selected
    ? model.document.nodes.find((candidate) => candidate.id === selected.id)
    : undefined;
  const filteredSteps = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return model.steps;
    return model.steps.filter((step) =>
      [step.title, step.preview, step.kind, step.id].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [model.steps, search]);

  if (!selected || !node) {
    return (
      <div className="grid min-h-72 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
        This flow has no editable steps.
      </div>
    );
  }

  const selectedIndex = model.steps.findIndex((step) => step.id === selected.id);
  const readOnlyNotice = () => {
    if (editable) return;
    onFuture(
      "Read-only version",
      "Choose the Draft version to edit. Published versions remain immutable.",
    );
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-background lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
      <aside className="border-b bg-muted/20 lg:border-b-0 lg:border-r">
        <div className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Flow steps</div>
              <div className="text-xs text-muted-foreground">{model.steps.length} total</div>
            </div>
            <Button
              data-flow-manager-live-action
              size="icon"
              variant="outline"
              title="Add step - Future"
              aria-label="Add step - Future"
              onClick={() =>
                onFuture(
                  "Add step",
                  "Step creation is next after deletion repair and stable destination rules are complete.",
                )
              }
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="relative mt-3 hidden lg:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 pl-8"
              placeholder="Find a step"
              aria-label="Find a step"
            />
          </div>
          <div className="mt-3 lg:hidden">
            <Label className="sr-only" htmlFor="guided-mobile-step">
              Selected step
            </Label>
            <Select value={selected.id} onValueChange={onSelect}>
              <SelectTrigger id="guided-mobile-step" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {model.steps.map((step, index) => (
                  <SelectItem key={step.id} value={step.id}>
                    {index + 1}. {step.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="hidden max-h-[calc(100vh-21rem)] min-h-[32rem] overflow-y-auto p-2 lg:block">
          {filteredSteps.map((step) => (
            <StepNavigationItem
              key={step.id}
              index={model.steps.findIndex((candidate) => candidate.id === step.id)}
              step={step}
              selected={step.id === selected.id}
              onSelect={() => onSelect(step.id)}
            />
          ))}
          {!filteredSteps.length ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No steps match your search.
            </div>
          ) : null}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="border-b bg-background px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Step {selectedIndex + 1} of {model.steps.length}
                </span>
                <span>/</span>
                <span>{selected.kind}</span>
                <StepStatus step={selected} />
              </div>
              <h2 className="mt-1 truncate text-base font-semibold">{selected.title}</h2>
              <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {selected.id}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                data-flow-manager-live-action
                size="icon"
                variant="ghost"
                title="Move step up - Future"
                aria-label="Move step up - Future"
                onClick={() =>
                  onFuture(
                    "Reorder step",
                    "Reordering will update explicit destinations without changing stable step IDs.",
                  )
                }
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                data-flow-manager-live-action
                size="icon"
                variant="ghost"
                title="Move step down - Future"
                aria-label="Move step down - Future"
                onClick={() =>
                  onFuture(
                    "Reorder step",
                    "Reordering will update explicit destinations without changing stable step IDs.",
                  )
                }
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                data-flow-manager-live-action
                size="icon"
                variant="ghost"
                className="text-destructive"
                title="Delete step - Future"
                aria-label="Delete step - Future"
                onClick={() =>
                  onFuture(
                    "Delete step",
                    "Deletion requires an explicit repair choice for every route that points to this step.",
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Step details</CardTitle>
                <CardDescription>Name this step clearly for the team.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                <Field label="Admin title">
                  <Input
                    aria-label="Admin title"
                    value={node.title ?? selected.title}
                    readOnly={!editable}
                    onClick={readOnlyNotice}
                    onChange={(event) =>
                      onUpdateNode(node.id, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Step type">
                  <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                    {humanize(node.type)}
                  </div>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customer message</CardTitle>
                <CardDescription>Message sent when the customer reaches this step.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Field label="English">
                  <Textarea
                    aria-label="Customer message in English"
                    value={node.messages?.en ?? ""}
                    rows={5}
                    readOnly={!editable}
                    onClick={readOnlyNotice}
                    onChange={(event) =>
                      onUpdateNode(node.id, (current) => ({
                        ...current,
                        messages: { ...current.messages, en: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Arabic">
                  <Textarea
                    aria-label="Customer message in Arabic"
                    value={node.messages?.ar ?? ""}
                    rows={5}
                    dir="rtl"
                    readOnly={!editable}
                    onClick={readOnlyNotice}
                    onChange={(event) =>
                      onUpdateNode(node.id, (current) => ({
                        ...current,
                        messages: { ...current.messages, ar: event.target.value },
                      }))
                    }
                  />
                </Field>
              </CardContent>
            </Card>

            {node.labels?.en || node.labels?.ar ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Customer label</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <Field label="English">
                    <Input
                      aria-label="Customer label in English"
                      value={node.labels?.en ?? ""}
                      readOnly={!editable}
                      onClick={readOnlyNotice}
                      onChange={(event) =>
                        onUpdateNode(node.id, (current) => ({
                          ...current,
                          labels: { ...current.labels, en: event.target.value },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Arabic">
                    <Input
                      aria-label="Customer label in Arabic"
                      value={node.labels?.ar ?? ""}
                      dir="rtl"
                      readOnly={!editable}
                      onClick={readOnlyNotice}
                      onChange={(event) =>
                        onUpdateNode(node.id, (current) => ({
                          ...current,
                          labels: { ...current.labels, ar: event.target.value },
                        }))
                      }
                    />
                  </Field>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Choices and destinations</CardTitle>
                    <CardDescription>
                      Each customer choice names the exact next step.
                    </CardDescription>
                  </div>
                  <Button
                    data-flow-manager-live-action
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onFuture(
                        "Add choice",
                        "New choices ship with duplicate-key validation and destination repair.",
                      )
                    }
                  >
                    <Plus className="size-4" /> Add choice <FutureLabel />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {node.options?.map((option) => (
                  <div key={option.key} className="rounded-md border bg-muted/15 p-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Button text (EN)">
                        <Input
                          aria-label={`Button text in English for ${option.key}`}
                          value={option.label.en ?? ""}
                          readOnly={!editable}
                          onClick={readOnlyNotice}
                          onChange={(event) =>
                            onUpdateOption(node.id, option.key, (current) => ({
                              ...current,
                              label: { ...current.label, en: event.target.value },
                            }))
                          }
                        />
                      </Field>
                      <Field label="Button text (AR)">
                        <Input
                          aria-label={`Button text in Arabic for ${option.key}`}
                          value={option.label.ar ?? ""}
                          dir="rtl"
                          readOnly={!editable}
                          onClick={readOnlyNotice}
                          onChange={(event) =>
                            onUpdateOption(node.id, option.key, (current) => ({
                              ...current,
                              label: { ...current.label, ar: event.target.value },
                            }))
                          }
                        />
                      </Field>
                    </div>
                    <div className="mt-3 grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                      <Field label="Then go to">
                        <Select
                          value={option.targetNodeId ?? "none"}
                          onValueChange={(value) => {
                            if (!editable) return readOnlyNotice();
                            onUpdateOption(node.id, option.key, (current) => ({
                              ...current,
                              targetNodeId: value === "none" ? undefined : value,
                            }));
                          }}
                        >
                          <SelectTrigger aria-label={`Destination for ${option.key}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No destination</SelectItem>
                            {model.steps
                              .filter((candidate) => candidate.id !== node.id)
                              .map((candidate) => (
                                <SelectItem key={candidate.id} value={candidate.id}>
                                  {candidate.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <div className="flex h-9 items-center gap-2">
                        <Switch
                          aria-label={`Active choice ${option.key}`}
                          checked={option.active !== false}
                          onCheckedChange={(checked) => {
                            if (!editable) return readOnlyNotice();
                            onUpdateOption(node.id, option.key, (current) => ({
                              ...current,
                              active: checked,
                            }));
                          }}
                        />
                        <span className="text-xs">Active</span>
                      </div>
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                      {option.key}
                    </div>
                  </div>
                ))}
                {!node.options?.length ? (
                  <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    This step has no customer choices.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Routing summary</CardTitle>
                <CardDescription>Where the conversation goes next.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.options.map((option) => (
                  <RouteSummary
                    key={option.key}
                    label={option.labelEn}
                    destination={option.targetTitle}
                    warning={option.missingTarget || !option.targetNodeId}
                    inactive={!option.active}
                  />
                ))}
                {selected.nextSteps.map((next) => (
                  <RouteSummary
                    key={next.edgeId}
                    label="After this step"
                    destination={next.title}
                    warning={next.missing}
                  />
                ))}
                {!selected.options.length && !selected.nextSteps.length ? (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    No next destination is saved.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Image and caption</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {node.mediaUrl ? (
                  <img
                    src={node.mediaUrl}
                    alt="Saved flow media"
                    className="aspect-video w-full rounded-md border object-contain"
                  />
                ) : (
                  <div className="grid aspect-video place-items-center rounded-md border-2 border-dashed bg-muted/30 text-xs text-muted-foreground">
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
                      "Image replacement is connected after draft conflict handling is complete.",
                    )
                  }
                >
                  <UploadCloud className="size-4" /> Upload image <FutureLabel />
                </Button>
                <Field label="Caption (EN)">
                  <Textarea
                    aria-label="Image caption in English"
                    rows={2}
                    value={node.mediaCaption?.en ?? ""}
                    readOnly={!editable}
                    onClick={readOnlyNotice}
                    onChange={(event) =>
                      onUpdateNode(node.id, (current) => ({
                        ...current,
                        mediaCaption: { ...current.mediaCaption, en: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Caption (AR)">
                  <Textarea
                    aria-label="Image caption in Arabic"
                    rows={2}
                    dir="rtl"
                    value={node.mediaCaption?.ar ?? ""}
                    readOnly={!editable}
                    onClick={readOnlyNotice}
                    onChange={(event) =>
                      onUpdateNode(node.id, (current) => ({
                        ...current,
                        mediaCaption: { ...current.mediaCaption, ar: event.target.value },
                      }))
                    }
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Step behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>Start step</span>
                  <StatusBadge tone={selected.isStart ? "success" : "neutral"}>
                    {selected.isStart ? "Yes" : "No"}
                  </StatusBadge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Optional</span>
                  <Switch
                    aria-label="Optional step"
                    checked={node.optional === true}
                    onCheckedChange={(checked) => {
                      if (!editable) return readOnlyNotice();
                      onUpdateNode(node.id, (current) => ({ ...current, optional: checked }));
                    }}
                  />
                </div>
                {node.protectedAction ? (
                  <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-950">
                    Protected backend action: <strong>{node.protectedAction}</strong>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {selected.issues.length ? (
              <Card className="border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="size-4 text-amber-700" /> Problems in this step
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {selected.issues.map((issue) => (
                    <div
                      key={`${issue.code}-${issue.path ?? ""}`}
                      className="rounded-md bg-amber-50 p-3"
                    >
                      {issue.message}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function StepNavigationItem({
  step,
  index,
  selected,
  onSelect,
}: {
  step: GuidedFlowStep;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const destinations = step.options.length + step.nextSteps.length;
  return (
    <button
      data-flow-manager-live-action
      type="button"
      onClick={onSelect}
      className={cn(
        "mb-1 grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2 rounded-md px-2 py-2.5 text-left transition",
        selected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "grid size-7 place-items-center rounded text-xs font-semibold",
          selected ? "bg-primary-foreground/15" : "bg-background",
        )}
      >
        {index + 1}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <StepIcon kind={step.kind} />
          <span className="truncate text-sm font-medium">{step.title}</span>
        </span>
        <span
          className={cn(
            "mt-1 block truncate text-[11px]",
            selected ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {step.isStart
            ? "Starts the flow"
            : `${destinations} next destination${destinations === 1 ? "" : "s"}`}
        </span>
      </span>
      <span className="pt-1">
        {step.status === "error" ? (
          <span className="block size-2 rounded-full bg-destructive" title="Error" />
        ) : step.status === "warning" ? (
          <span className="block size-2 rounded-full bg-amber-400" title="Warning" />
        ) : (
          <span
            className={cn("block size-2 rounded-full", selected ? "bg-white" : "bg-emerald-500")}
            title="Ready"
          />
        )}
      </span>
    </button>
  );
}

function RouteSummary({
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
    <div className="rounded-md border p-3 text-xs">
      <div className="flex items-start gap-2">
        <GitBranch className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-muted-foreground">{label}</div>
          <div className={cn("mt-0.5 truncate font-medium", warning && "text-destructive")}>
            {destination}
          </div>
        </div>
        {inactive ? <StatusBadge tone="neutral">Off</StatusBadge> : null}
      </div>
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
  return <StatusBadge tone="success">Ready</StatusBadge>;
}

function StepIcon({ kind }: { kind: GuidedStepKind }) {
  const className = "size-3.5 shrink-0";
  if (kind === "Image") return <ImageIcon className={className} />;
  if (kind === "Catalog") return <ListTree className={className} />;
  if (kind === "Branch") return <GitBranch className={className} />;
  if (kind === "Handoff") return <User className={className} />;
  if (kind === "End") return <Square className={className} />;
  return <MessageSquare className={className} />;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function FutureLabel() {
  return (
    <span className="rounded-sm border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-800">
      Future
    </span>
  );
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
