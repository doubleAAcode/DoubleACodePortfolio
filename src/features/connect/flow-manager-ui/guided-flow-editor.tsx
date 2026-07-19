import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Copy,
  GitBranch,
  Image as ImageIcon,
  ListTree,
  MessageSquare,
  MoreHorizontal,
  Pencil,
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
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  GUIDED_WHATSAPP_BUTTON_TITLE_MAX,
  GUIDED_WHATSAPP_REPLY_OPTION_LIMIT,
} from "@/features/connect/flow-manager-ui/guided-flow-draft";
import type {
  GuidedFlowModel,
  GuidedFlowStep,
  GuidedStepKind,
} from "@/features/connect/flow-manager-ui/guided-flow-model";
import type { CanonicalFlowNode } from "@/features/connect/shared/flow-document";
import type { FlowNodeOption } from "@/features/connect/shared/flow-template-types";
import { cn } from "@/lib/utils";

export const WHATSAPP_REPLY_OPTION_LIMIT = GUIDED_WHATSAPP_REPLY_OPTION_LIMIT;

export function GuidedFlowEditor({
  model,
  selectedId,
  editable,
  onSelect,
  onUpdateNode,
  onUpdateOption,
  onUpdateAutomaticDestination,
  onFuture,
  onAddStep,
  onDuplicateStep,
  onMoveStep,
  onDeleteStep,
  onAddChoice,
  onRemoveChoice,
  view = "tree",
  onEdit,
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
  onUpdateAutomaticDestination: (nodeId: string, targetNodeId: string | undefined) => void;
  onFuture: (feature: string, description: string) => void;
  onAddStep: () => void;
  onDuplicateStep: (id: string) => void;
  onMoveStep: (id: string, direction: "up" | "down") => void;
  onDeleteStep: (id: string) => void;
  onAddChoice: (nodeId: string) => void;
  onRemoveChoice: (nodeId: string, optionKey: string) => void;
  view?: "tree" | "selected";
  onEdit?: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = model.steps.find((step) => step.id === selectedId) ?? model.steps[0];
  const node = selected
    ? model.document.nodes.find((candidate) => candidate.id === selected.id)
    : undefined;
  const automaticEdges = node
    ? model.document.edges.filter((edge) => edge.from === node.id && !edge.condition?.trim())
    : [];
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

  if (view === "tree") {
    return (
      <StructuredFlowTree
        model={model}
        selectedId={selected.id}
        onEdit={(id) => {
          onSelect(id);
          onEdit?.(id);
        }}
        onFuture={onFuture}
        onAddStep={onAddStep}
        onDuplicateStep={onDuplicateStep}
        onMoveStep={onMoveStep}
        onDeleteStep={onDeleteStep}
        onAddChoice={onAddChoice}
      />
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-background lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
      <aside className="border-b bg-muted/20 lg:border-b-0 lg:border-r">
        <div className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Conversation path</div>
              <div className="text-xs text-muted-foreground">
                {model.steps.length} steps - follow the arrows
              </div>
            </div>
            <Button
              data-flow-manager-live-action
              size="icon"
              variant="outline"
              title="Add step"
              aria-label="Add step"
              onClick={onAddStep}
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
              steps={model.steps}
              selected={step.id === selected.id}
              onSelect={onSelect}
            />
          ))}
          {!filteredSteps.length ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No steps match your search.
            </div>
          ) : null}
        </div>
      </aside>

      <section className="min-w-0 overflow-y-auto">
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
                title="Move step up"
                aria-label="Move step up"
                disabled={selected.isStart || selectedIndex <= (model.document.startNodeId ? 1 : 0)}
                onClick={() => onMoveStep(selected.id, "up")}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                data-flow-manager-live-action
                size="icon"
                variant="ghost"
                title="Move step down"
                aria-label="Move step down"
                disabled={selected.isStart || selectedIndex >= model.steps.length - 1}
                onClick={() => onMoveStep(selected.id, "down")}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                data-flow-manager-live-action
                size="icon"
                variant="ghost"
                title="Duplicate step"
                aria-label="Duplicate step"
                onClick={() => onDuplicateStep(selected.id)}
              >
                <Copy className="size-4" />
              </Button>
              <Button
                data-flow-manager-live-action
                size="icon"
                variant="ghost"
                className="text-destructive"
                title={selected.isStart ? "Start step cannot be deleted" : "Delete step"}
                aria-label={selected.isStart ? "Start step cannot be deleted" : "Delete step"}
                disabled={selected.isStart}
                onClick={() => onDeleteStep(selected.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="order-first min-w-0 space-y-4 xl:order-none">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Step details</CardTitle>
                <CardDescription>Name this step clearly for the team.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                <Field label="Admin title">
                  <Input
                    aria-label="Admin title"
                    data-guided-control="behavior"
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
                    data-guided-control="message"
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
                    data-guided-control="message"
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
                    data-guided-control="choices"
                    size="sm"
                    variant="outline"
                    disabled={(node.options?.length ?? 0) >= WHATSAPP_REPLY_OPTION_LIMIT}
                    title={
                      (node.options?.length ?? 0) >= WHATSAPP_REPLY_OPTION_LIMIT
                        ? "WhatsApp allows three reply buttons"
                        : "Add choice"
                    }
                    onClick={() => onAddChoice(node.id)}
                  >
                    <Plus className="size-4" /> Add choice
                    <span className="text-[10px] text-muted-foreground">
                      {node.options?.length ?? 0}/{WHATSAPP_REPLY_OPTION_LIMIT}
                    </span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!(node.options?.length ?? 0) || automaticEdges.length ? (
                  <div className="rounded-md border bg-muted/15 p-3">
                    <Field label="Automatic continuation">
                      <Select
                        value={automaticEdges[0]?.to ?? "none"}
                        onValueChange={(value) => {
                          if (!editable) return readOnlyNotice();
                          onUpdateAutomaticDestination(
                            node.id,
                            value === "none" ? undefined : value,
                          );
                        }}
                      >
                        <SelectTrigger
                          data-guided-control="destination"
                          aria-label="Automatic destination"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No automatic destination</SelectItem>
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
                    <p className="mt-2 text-xs text-muted-foreground">
                      {node.type === "END" || node.type === "HUMAN_HANDOFF"
                        ? "End and handoff steps should have no automatic destination."
                        : "Used when this step finishes without waiting for a customer reply."}
                    </p>
                    {automaticEdges.length > 1 ? (
                      <p className="mt-2 text-xs font-medium text-destructive">
                        Multiple automatic routes are saved. Choose one destination to repair them.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {node.options?.map((option, optionIndex) => (
                  <div key={option.key} className="rounded-md border bg-muted/15 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold">Reply {optionIndex + 1}</span>
                      <Button
                        data-flow-manager-live-action
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        title="Remove reply"
                        aria-label={`Remove choice ${option.key}`}
                        onClick={() => onRemoveChoice(node.id, option.key)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Button text (EN)">
                        <Input
                          aria-label={`Button text in English for ${option.key}`}
                          data-guided-control="choices"
                          data-guided-option-key={option.key}
                          value={option.label.en ?? ""}
                          maxLength={GUIDED_WHATSAPP_BUTTON_TITLE_MAX}
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
                          data-guided-control="choices"
                          data-guided-option-key={option.key}
                          value={option.label.ar ?? ""}
                          maxLength={GUIDED_WHATSAPP_BUTTON_TITLE_MAX}
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
                          <SelectTrigger
                            data-guided-control="destination"
                            data-guided-option-key={option.key}
                            aria-label={`Destination for ${option.key}`}
                          >
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
                <CardTitle className="text-base">What happens next</CardTitle>
                <CardDescription>Follow every route from this step.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.options.map((option) => (
                  <RouteSummary
                    key={option.key}
                    event="When customer chooses"
                    label={option.labelEn || option.key}
                    targetId={option.targetNodeId}
                    targetNumber={stepNumber(model.steps, option.targetNodeId)}
                    destination={option.targetTitle}
                    warning={option.missingTarget || !option.targetNodeId}
                    inactive={!option.active}
                    onSelect={onSelect}
                  />
                ))}
                {selected.nextSteps.map((next) => (
                  <RouteSummary
                    key={next.edgeId}
                    event="When this step finishes"
                    label="Continue automatically"
                    targetId={next.id}
                    targetNumber={stepNumber(model.steps, next.id)}
                    destination={next.title}
                    warning={next.missing}
                    onSelect={onSelect}
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
                  data-guided-control="media"
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
                    data-guided-control="behavior"
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

type GuidedTreeRoute = {
  id: string;
  kind: "option" | "automatic";
  label: string;
  targetId: string | null;
  targetTitle: string;
  missing: boolean;
  inactive: boolean;
};

function StructuredFlowTree({
  model,
  selectedId,
  onEdit,
  onFuture,
  onAddStep,
  onDuplicateStep,
  onMoveStep,
  onDeleteStep,
  onAddChoice,
}: {
  model: GuidedFlowModel;
  selectedId: string;
  onEdit: (id: string) => void;
  onFuture: (feature: string, description: string) => void;
  onAddStep: () => void;
  onDuplicateStep: (id: string) => void;
  onMoveStep: (id: string, direction: "up" | "down") => void;
  onDeleteStep: (id: string) => void;
  onAddChoice: (nodeId: string) => void;
}) {
  const start = model.steps.find((step) => step.isStart) ?? model.steps[0];
  const reachableIds = useMemo(
    () => collectReachableStepIds(model.steps, start?.id),
    [model.steps, start],
  );
  const unconnectedSteps = model.steps.filter((step) => !reachableIds.has(step.id));
  const overflowSteps = model.steps.filter(
    (step) => step.options.length > WHATSAPP_REPLY_OPTION_LIMIT,
  );

  if (!start) return null;

  const addReplyOption = () => {
    onAddChoice(start.id);
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold">Conversation map</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Follow each reply from the start. Select Edit to change a step.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          <span className="rounded-md border bg-muted/40 px-2 py-1">
            {model.steps.length} saved steps
          </span>
          <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-sky-800">
            Max 3 WhatsApp replies
          </span>
          <Button size="sm" variant="outline" onClick={onAddStep}>
            <Plus className="size-4" /> Add step
          </Button>
        </div>
      </div>

      {overflowSteps.length ? (
        <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:px-5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-semibold">Saved flow exceeds the WhatsApp reply limit</div>
              <div className="mt-1 text-xs">
                {overflowSteps.map((step) => `${step.title} (${step.options.length})`).join(", ")}.
                Open each step and leave no more than three saved choices before publishing.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto bg-muted/10">
        <div className="min-w-[920px] px-8 py-7">
          <FlowTreeNode
            step={start}
            steps={model.steps}
            selectedId={selectedId}
            path={[]}
            depth={0}
            onEdit={onEdit}
            onDuplicateStep={onDuplicateStep}
            onMoveStep={onMoveStep}
            onDeleteStep={onDeleteStep}
          />

          <div className="mx-auto mt-8 flex w-fit flex-col items-center gap-3">
            <Button
              data-flow-manager-live-action
              size="sm"
              variant="outline"
              className="border-dashed"
              disabled={start.options.length >= WHATSAPP_REPLY_OPTION_LIMIT}
              title={
                start.options.length >= WHATSAPP_REPLY_OPTION_LIMIT
                  ? "WhatsApp allows three reply buttons"
                  : "Add reply option"
              }
              onClick={addReplyOption}
            >
              <Plus className="size-4" /> Add reply option
              {start.options.length >= WHATSAPP_REPLY_OPTION_LIMIT ? (
                <span className="rounded-sm bg-muted px-1 py-0.5 text-[9px] uppercase">
                  Limit 3
                </span>
              ) : null}
            </Button>
            <Button
              data-flow-manager-live-action
              size="sm"
              variant="outline"
              className="border-dashed"
              onClick={() =>
                onFuture(
                  "Add starting path",
                  "Additional entry paths require trigger priority and fallback rules before they can save safely.",
                )
              }
            >
              <Plus className="size-4" /> Add starting path <FutureLabel />
            </Button>
          </div>
        </div>
      </div>

      {unconnectedSteps.length ? (
        <div className="border-t px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-amber-600" /> Unconnected saved steps
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            These steps are saved but no route from the start reaches them. They stay visible for
            repair.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unconnectedSteps.map((step) => (
              <button
                data-flow-manager-live-action
                key={step.id}
                type="button"
                onClick={() => onEdit(step.id)}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition hover:border-primary/40 hover:bg-muted/30"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <StepIcon kind={step.kind} />
                    <span className="truncate">{step.title}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Step {stepNumber(model.steps, step.id)} - {step.kind}
                  </span>
                </span>
                <Pencil className="size-3.5 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FlowTreeNode({
  step,
  steps,
  selectedId,
  path,
  depth,
  onEdit,
  onDuplicateStep,
  onMoveStep,
  onDeleteStep,
}: {
  step: GuidedFlowStep;
  steps: GuidedFlowStep[];
  selectedId: string;
  path: string[];
  depth: number;
  onEdit: (id: string) => void;
  onDuplicateStep: (id: string) => void;
  onMoveStep: (id: string, direction: "up" | "down") => void;
  onDeleteStep: (id: string) => void;
}) {
  const routes = routesForStep(step);
  const optionRoutes = routes.filter((route) => route.kind === "option");
  const automaticRoutes = routes.filter((route) => route.kind === "automatic");
  const visibleRoutes = [...optionRoutes.slice(0, WHATSAPP_REPLY_OPTION_LIMIT), ...automaticRoutes];
  const currentPath = [...path, step.id];

  return (
    <div className="flex min-w-fit flex-col items-center">
      <FlowStepCard
        step={step}
        stepNumber={stepNumber(steps, step.id) ?? 1}
        stepCount={steps.length}
        selected={step.id === selectedId}
        onEdit={onEdit}
        onDuplicateStep={onDuplicateStep}
        onMoveStep={onMoveStep}
        onDeleteStep={onDeleteStep}
      />

      {optionRoutes.length > WHATSAPP_REPLY_OPTION_LIMIT ? (
        <button
          data-flow-manager-live-action
          type="button"
          onClick={() => onEdit(step.id)}
          className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-[10px] font-semibold text-destructive"
        >
          {optionRoutes.length - WHATSAPP_REPLY_OPTION_LIMIT} extra saved option(s) - Edit to repair
        </button>
      ) : null}

      {visibleRoutes.length ? (
        <>
          <div className="h-7 w-px bg-border" />
          <div
            className={cn(
              "grid min-w-fit gap-6",
              visibleRoutes.length > 1 && "border-t border-border",
            )}
            style={{
              gridTemplateColumns: `repeat(${visibleRoutes.length}, minmax(252px, 1fr))`,
            }}
          >
            {visibleRoutes.map((route, index) => {
              const target = route.targetId
                ? steps.find((candidate) => candidate.id === route.targetId)
                : undefined;
              const isReturn = Boolean(route.targetId && currentPath.includes(route.targetId));
              const targetIndex = stepNumber(steps, route.targetId);
              const branchLabel = route.kind === "option" ? String.fromCharCode(65 + index) : null;

              return (
                <div key={route.id} className="flex min-w-0 flex-col items-center">
                  <div className="h-5 w-px bg-border" />
                  <button
                    data-flow-manager-live-action
                    type="button"
                    onClick={() => route.targetId && target && onEdit(route.targetId)}
                    className={cn(
                      "flex h-11 w-full items-center gap-2 rounded-full border bg-background px-3 text-left shadow-sm transition",
                      target && "hover:border-primary/40 hover:bg-muted/20",
                      route.missing && "border-destructive/40 bg-destructive/5",
                      route.inactive && "opacity-60",
                    )}
                  >
                    {branchLabel ? (
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sky-50 text-[10px] font-semibold text-sky-700">
                        {branchLabel}
                      </span>
                    ) : (
                      <ArrowDown className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{route.label}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {route.inactive ? "Inactive - " : ""}
                        {route.targetTitle}
                      </span>
                    </span>
                  </button>
                  <div className="h-5 w-px bg-border" />

                  {route.missing || !target ? (
                    <FlowTerminalLabel tone="error">Missing destination</FlowTerminalLabel>
                  ) : isReturn ? (
                    <button
                      data-flow-manager-live-action
                      type="button"
                      onClick={() => onEdit(target.id)}
                      className="rounded-full border bg-muted/50 px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground"
                    >
                      Returns to Step {targetIndex} - {target.title}
                    </button>
                  ) : depth >= 2 ? (
                    <button
                      data-flow-manager-live-action
                      type="button"
                      onClick={() => onEdit(target.id)}
                      className="rounded-full border bg-muted/50 px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground"
                    >
                      Continues to Step {targetIndex} - {target.title}
                    </button>
                  ) : (
                    <FlowTreeNode
                      step={target}
                      steps={steps}
                      selectedId={selectedId}
                      path={currentPath}
                      depth={depth + 1}
                      onEdit={onEdit}
                      onDuplicateStep={onDuplicateStep}
                      onMoveStep={onMoveStep}
                      onDeleteStep={onDeleteStep}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="h-5 w-px bg-border" />
          <FlowTerminalLabel>
            {step.kind === "End" ? "End of chat" : "Conversation stops"}
          </FlowTerminalLabel>
        </>
      )}
    </div>
  );
}

function FlowStepCard({
  step,
  stepNumber,
  stepCount,
  selected,
  onEdit,
  onDuplicateStep,
  onMoveStep,
  onDeleteStep,
}: {
  step: GuidedFlowStep;
  stepNumber: number;
  stepCount: number;
  selected: boolean;
  onEdit: (id: string) => void;
  onDuplicateStep: (id: string) => void;
  onMoveStep: (id: string, direction: "up" | "down") => void;
  onDeleteStep: (id: string) => void;
}) {
  return (
    <div
      data-guided-tree-node={step.id}
      tabIndex={-1}
      className={cn(
        "w-[252px] overflow-hidden rounded-lg border bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary",
        selected && "border-primary ring-1 ring-primary",
      )}
    >
      <div className="flex items-start gap-2 border-b px-3 py-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sky-50 text-sky-700">
          <StepIcon kind={step.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase text-muted-foreground">
            Step {String(stepNumber).padStart(2, "0")}
            {step.isStart ? (
              <span className="rounded-sm bg-sky-50 px-1 py-0.5 text-sky-700">Start</span>
            ) : null}
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold">{step.title}</div>
        </div>
        <StepStatus step={step} />
      </div>
      <div className="min-h-[58px] px-3 py-2.5 text-xs leading-5 text-muted-foreground">
        <p className="line-clamp-2">{step.preview || "No customer-facing copy yet."}</p>
      </div>
      <div className="flex h-10 items-center justify-between border-t px-3">
        <span className="text-[9px] font-semibold uppercase text-muted-foreground">
          {step.kind}
        </span>
        <div className="flex items-center gap-1">
          <Button
            data-flow-manager-live-action
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => onEdit(step.id)}
          >
            <Pencil className="size-3.5" /> Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-flow-manager-live-action
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                title="More step actions"
                aria-label="More step actions"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onDuplicateStep(step.id)}>
                <Copy className="size-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={step.isStart || stepNumber <= 2}
                onSelect={() => onMoveStep(step.id, "up")}
              >
                <ArrowUp className="size-4" /> Move up
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={step.isStart || stepNumber >= stepCount}
                onSelect={() => onMoveStep(step.id, "down")}
              >
                <ArrowDown className="size-4" /> Move down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={step.isStart}
                className="text-destructive focus:text-destructive"
                onSelect={() => onDeleteStep(step.id)}
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function FlowTerminalLabel({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <span
      className={cn(
        "rounded-full border bg-muted/50 px-3 py-1 text-[9px] font-semibold uppercase text-muted-foreground",
        tone === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

function routesForStep(step: GuidedFlowStep): GuidedTreeRoute[] {
  return [
    ...step.options.map((option) => ({
      id: `option-${step.id}-${option.key}`,
      kind: "option" as const,
      label: option.labelEn || option.key,
      targetId: option.targetNodeId,
      targetTitle: option.targetTitle,
      missing: option.missingTarget || !option.targetNodeId,
      inactive: !option.active,
    })),
    ...step.nextSteps.map((next) => ({
      id: next.edgeId,
      kind: "automatic" as const,
      label: "Continue automatically",
      targetId: next.id,
      targetTitle: next.title,
      missing: next.missing,
      inactive: false,
    })),
  ];
}

function collectReachableStepIds(steps: GuidedFlowStep[], startId?: string) {
  const reachable = new Set<string>();
  const queue = startId ? [startId] : [];
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const step = steps.find((candidate) => candidate.id === id);
    if (!step) continue;
    for (const route of routesForStep(step)) {
      if (route.targetId && !route.missing) queue.push(route.targetId);
    }
  }
  return reachable;
}

function StepNavigationItem({
  step,
  steps,
  index,
  selected,
  onSelect,
}: {
  step: GuidedFlowStep;
  steps: GuidedFlowStep[];
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const routes = [
    ...step.options.map((option) => ({
      key: `option-${option.key}`,
      label: option.labelEn || option.key,
      targetId: option.targetNodeId,
      targetTitle: option.targetTitle,
      missing: option.missingTarget || !option.targetNodeId,
      inactive: !option.active,
    })),
    ...step.nextSteps.map((next) => ({
      key: next.edgeId,
      label: "Then",
      targetId: next.id,
      targetTitle: next.title,
      missing: next.missing,
      inactive: false,
    })),
  ];

  return (
    <div
      className={cn(
        "mb-1 rounded-md transition",
        selected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      <button
        data-flow-manager-live-action
        type="button"
        onClick={() => onSelect(step.id)}
        className="grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2 rounded-md px-2 py-2.5 text-left"
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
              : `${routes.length} route${routes.length === 1 ? "" : "s"}`}
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

      <div className="space-y-1 px-2 pb-2 pl-10">
        {routes.map((route) => {
          const targetNumber = stepNumber(steps, route.targetId);
          return (
            <button
              data-flow-manager-live-action
              key={route.key}
              type="button"
              disabled={route.missing || !route.targetId}
              onClick={() => route.targetId && onSelect(route.targetId)}
              className={cn(
                "grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 rounded px-2 py-1.5 text-left text-[10px]",
                selected
                  ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                  : "bg-background/70 hover:bg-background",
                route.missing && "text-destructive",
                route.inactive && "opacity-60",
              )}
              aria-label={`${route.label}, go to ${route.targetTitle}`}
            >
              <span className="truncate">{route.label}</span>
              <ArrowRight className="size-3" />
              <span className="truncate font-medium">
                {targetNumber ? `${targetNumber}. ` : ""}
                {route.targetTitle}
              </span>
            </button>
          );
        })}
        {!routes.length ? (
          <div
            className={cn(
              "px-2 pb-1 text-[10px]",
              selected ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            Conversation ends here
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RouteSummary({
  event,
  label,
  targetId,
  targetNumber,
  destination,
  warning,
  inactive = false,
  onSelect,
}: {
  event: string;
  label: string;
  targetId: string | null;
  targetNumber: number | null;
  destination: string;
  warning: boolean;
  inactive?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      data-flow-manager-live-action
      type="button"
      disabled={warning || !targetId}
      onClick={() => targetId && onSelect(targetId)}
      className="w-full rounded-md border p-3 text-left text-xs transition hover:border-primary/40 hover:bg-muted/30 disabled:cursor-default disabled:opacity-100"
      aria-label={`${event} ${label}, go to ${destination}`}
    >
      <div className="flex items-start gap-2">
        <GitBranch className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="text-[10px] font-semibold uppercase text-muted-foreground">{event}</div>
            <div className="mt-0.5 font-medium">{label}</div>
          </div>
          <div className="flex items-center gap-2 border-t pt-2">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Then</span>
            <ArrowRight className="size-3 shrink-0" />
            <span className={cn("min-w-0 truncate font-semibold", warning && "text-destructive")}>
              {targetNumber ? `Step ${targetNumber} - ` : ""}
              {destination}
            </span>
          </div>
        </div>
        {inactive ? <StatusBadge tone="neutral">Off</StatusBadge> : null}
      </div>
    </button>
  );
}

function stepNumber(steps: GuidedFlowStep[], id: string | null) {
  if (!id) return null;
  const index = steps.findIndex((step) => step.id === id);
  return index >= 0 ? index + 1 : null;
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
