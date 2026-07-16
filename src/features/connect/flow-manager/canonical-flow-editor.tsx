import {
  AlertTriangle,
  CheckCircle2,
  CircleStop,
  GitBranch,
  Image as ImageIcon,
  ListTree,
  MessageSquare,
  Plus,
  Save,
  ShoppingCart,
  Trash2,
  UploadCloud,
  UserRoundCheck,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  addVisualNode,
  getEffectiveVisualEdges,
  visualBlockPalette,
  WHATSAPP_MAX_VISIBLE_OPTIONS,
  type VisualFlowBlockType,
  type VisualFlowDefinition,
  type VisualFlowNode,
} from "@/features/connect/shared/visual-flow-builder";
import type { BusinessFlowVersionRow } from "@/features/connect/shared/flow-template-store.server";
import type {
  FlowValidationIssue,
  FlowValidationResult,
} from "@/features/connect/shared/flow-template-types";

import { CanonicalFlowCanvas } from "./canonical-flow-canvas";

export function CanonicalFlowManagerEditor({
  businessName,
  flow,
  validation,
  selectedNodeId,
  selectedVersionId,
  versions,
  flowName,
  busy,
  dirty,
  onChange,
  onFlowNameChange,
  onSelectNode,
  onSelectVersion,
  onSave,
  onPublish,
  onUploadImage,
}: {
  businessName: string;
  flow: VisualFlowDefinition;
  validation: FlowValidationResult;
  selectedNodeId: string;
  selectedVersionId: string;
  versions: BusinessFlowVersionRow[];
  flowName: string;
  busy: string;
  dirty: boolean;
  onChange: (flow: VisualFlowDefinition) => void;
  onFlowNameChange: (name: string) => void;
  onSelectNode: (nodeId: string) => void;
  onSelectVersion: (versionId: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onUploadImage: (file: File) => Promise<string>;
}) {
  const [newBlockType, setNewBlockType] = useState<VisualFlowBlockType>("SEND_MESSAGE");
  const selectedNode = flow.nodes.find((node) => node.id === selectedNodeId) ?? flow.nodes[0];
  const selectedVersion = versions.find((version) => version.id === selectedVersionId);
  const isReadOnly = selectedVersion?.status !== "DRAFT";

  function addStep() {
    const next = addVisualNode(flow, newBlockType);
    onChange(next);
    onSelectNode(next.nodes[next.nodes.length - 1]?.id ?? "");
  }

  function updateSelected(update: (node: VisualFlowNode) => VisualFlowNode) {
    if (!selectedNode || isReadOnly) return;
    onChange({
      ...flow,
      nodes: flow.nodes.map((node) =>
        node.id === selectedNode.id
          ? { ...update(node), updatedAt: new Date().toISOString() }
          : node,
      ),
    });
  }

  function removeSelected() {
    if (!selectedNode || selectedNode.type === "START" || isReadOnly) return;
    const remaining = flow.nodes.filter((node) => node.id !== selectedNode.id);
    onChange({
      ...flow,
      nodes: remaining,
      edges: flow.edges.filter(
        (edge) => edge.sourceNodeId !== selectedNode.id && edge.targetNodeId !== selectedNode.id,
      ),
    });
    onSelectNode(remaining[0]?.id ?? "");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Editing for {businessName}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Input
              value={flowName}
              disabled={isReadOnly || Boolean(busy)}
              onChange={(event) => onFlowNameChange(event.target.value)}
              aria-label="Flow name"
              className="h-9 min-w-64 max-w-lg text-base font-semibold"
            />
            {dirty ? <Badge variant="secondary">Unsaved changes</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedVersionId}
            onValueChange={onSelectVersion}
            disabled={Boolean(busy) || dirty}
          >
            <SelectTrigger
              className="h-9 w-48"
              title={dirty ? "Save or discard changes before switching versions" : undefined}
            >
              <SelectValue placeholder="Choose version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.status === "DRAFT"
                    ? "Draft"
                    : version.status === "PUBLISHED"
                      ? "Live"
                      : "Archived"}{" "}
                  v{version.version_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isReadOnly || Boolean(busy)}
            onClick={onSave}
          >
            <Save className="size-4" />
            {busy === "save" ? "Saving..." : "Save draft"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isReadOnly || Boolean(busy) || !validation.ok}
            onClick={onPublish}
          >
            {busy === "publish" ? "Publishing..." : "Publish changes"}
          </Button>
        </div>
      </div>

      {isReadOnly ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          This published version is read-only. Select the draft to edit it.
        </div>
      ) : null}

      <Tabs defaultValue="guided">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="guided">Guided</TabsTrigger>
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="selected">Selected Step</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="validation">
              Validation
              {validation.issues.length ? (
                <span className="ml-1 rounded-full bg-destructive/10 px-1.5 text-[10px] text-destructive">
                  {validation.issues.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          {!isReadOnly ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={newBlockType}
                onValueChange={(value) => setNewBlockType(value as VisualFlowBlockType)}
              >
                <SelectTrigger className="h-9 w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visualBlockPalette.map((item) => (
                    <SelectItem key={item.type} value={item.type}>
                      {item.category}: {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="size-4" />
                Add step
              </Button>
            </div>
          ) : null}
        </div>

        <TabsContent value="guided" className="mt-4">
          <GuidedJourney
            flow={flow}
            validation={validation}
            selectedNodeId={selectedNode?.id ?? ""}
            onSelectNode={onSelectNode}
          />
        </TabsContent>
        <TabsContent value="canvas" className="mt-4">
          <CanonicalFlowCanvas
            flow={flow}
            validation={validation}
            selectedNodeId={selectedNode?.id ?? ""}
            onChange={isReadOnly ? () => undefined : onChange}
            onSelectNode={onSelectNode}
          />
        </TabsContent>
        <TabsContent value="selected" className="mt-4">
          {selectedNode ? (
            <SelectedStepEditor
              node={selectedNode}
              allNodes={flow.nodes}
              readOnly={isReadOnly}
              onUpdate={updateSelected}
              onDelete={removeSelected}
              onUploadImage={onUploadImage}
            />
          ) : (
            <EmptyFlow />
          )}
        </TabsContent>
        <TabsContent value="preview" className="mt-4">
          <WhatsAppPreview node={selectedNode} version={selectedVersion} />
        </TabsContent>
        <TabsContent value="validation" className="mt-4">
          <ValidationPanel
            issues={validation.issues}
            nodes={flow.nodes}
            onSelectNode={onSelectNode}
          />
        </TabsContent>
        <TabsContent value="advanced" className="mt-4">
          <AdvancedPanel flow={flow} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GuidedJourney({
  flow,
  validation,
  selectedNodeId,
  onSelectNode,
}: {
  flow: VisualFlowDefinition;
  validation: FlowValidationResult;
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}) {
  const edges = getEffectiveVisualEdges(flow);
  const nodeById = new Map(flow.nodes.map((node) => [node.id, node]));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Conversation journey</CardTitle>
        <CardDescription>
          The real saved steps and routes. Select a step to configure its customer-facing behavior.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {flow.nodes.map((node, index) => {
          const issues = validation.issues.filter((issue) => issue.nodeId === node.id);
          const targets = edges
            .filter((edge) => edge.sourceNodeId === node.id)
            .map((edge) => nodeById.get(edge.targetNodeId)?.title ?? edge.targetNodeId);
          const Icon = iconForType(node.type);
          return (
            <button
              type="button"
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className={`min-w-0 rounded-lg border bg-card p-4 text-left shadow-sm transition hover:shadow ${
                selectedNodeId === node.id ? "border-primary ring-2 ring-primary/15" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  {index + 1}. {friendlyType(node.type)}
                </span>
                <StepStatus issues={issues} />
              </div>
              <div className="mt-3 truncate text-sm font-semibold">{node.title}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {previewText(node)}
              </div>
              <div className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">
                {targets.length ? `Next: ${targets.join(", ")}` : "No outgoing route"}
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SelectedStepEditor({
  node,
  allNodes,
  readOnly,
  onUpdate,
  onDelete,
  onUploadImage,
}: {
  node: VisualFlowNode;
  allNodes: VisualFlowNode[];
  readOnly: boolean;
  onUpdate: (update: (node: VisualFlowNode) => VisualFlowNode) => void;
  onDelete: () => void;
  onUploadImage: (file: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const supportsMessage =
    Boolean(node.config.messages) || ["START", "SEND_MESSAGE", "SEND_IMAGE"].includes(node.type);
  const supportsLabels = Boolean(node.config.labels);
  const supportsOptions = node.type === "MAIN_MENU" || Boolean(node.config.menuOptions);

  function patchConfig(patch: Partial<VisualFlowNode["config"]>) {
    onUpdate((current) => ({ ...current, config: { ...current.config, ...patch } }));
  }

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      patchConfig({ mediaUrl: await onUploadImage(file) });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Step identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Admin title</Label>
              <Input
                value={node.title}
                disabled={readOnly}
                onChange={(event) =>
                  onUpdate((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Step type</Label>
              <Input value={friendlyType(node.type)} disabled />
            </div>
          </CardContent>
        </Card>

        {supportsMessage || supportsLabels ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer-facing copy</CardTitle>
              <CardDescription>English and Arabic content sent through WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <LanguageField
                label="English"
                value={(supportsMessage ? node.config.messages?.en : node.config.labels?.en) ?? ""}
                readOnly={readOnly}
                onChange={(value) =>
                  patchConfig(
                    supportsMessage
                      ? { messages: { ...node.config.messages, en: value } }
                      : { labels: { ...node.config.labels, en: value } },
                  )
                }
              />
              <LanguageField
                label="Arabic"
                value={(supportsMessage ? node.config.messages?.ar : node.config.labels?.ar) ?? ""}
                readOnly={readOnly}
                rtl
                onChange={(value) =>
                  patchConfig(
                    supportsMessage
                      ? { messages: { ...node.config.messages, ar: value } }
                      : { labels: { ...node.config.labels, ar: value } },
                  )
                }
              />
            </CardContent>
          </Card>
        ) : null}

        {supportsOptions ? (
          <MenuOptionsEditor
            node={node}
            allNodes={allNodes}
            readOnly={readOnly}
            onOptionsChange={(menuOptions) => patchConfig({ menuOptions })}
          />
        ) : null}

        {node.type === "QUESTION" && node.config.question ? (
          <QuestionEditor node={node} readOnly={readOnly} patchConfig={patchConfig} />
        ) : null}
      </div>

      <div className="space-y-4">
        {node.type === "SEND_IMAGE" ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Image / media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid min-h-36 place-items-center overflow-hidden rounded-md border-2 border-dashed bg-muted/40 text-xs text-muted-foreground">
                {node.config.mediaUrl ? (
                  <img
                    src={node.config.mediaUrl}
                    alt="Flow media"
                    className="max-h-52 w-full object-contain"
                  />
                ) : (
                  "No image attached"
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <label>
                  <UploadCloud className="size-4" />
                  {uploading ? "Uploading..." : "Upload image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={readOnly || uploading}
                    className="sr-only"
                    onChange={(event) => void upload(event.target.files?.[0])}
                  />
                </label>
              </Button>
              {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
              <LanguageField
                label="Caption (EN)"
                value={node.config.mediaCaption?.en ?? ""}
                readOnly={readOnly}
                onChange={(value) =>
                  patchConfig({ mediaCaption: { ...node.config.mediaCaption, en: value } })
                }
              />
              <LanguageField
                label="Caption (AR)"
                value={node.config.mediaCaption?.ar ?? ""}
                readOnly={readOnly}
                rtl
                onChange={(value) =>
                  patchConfig({ mediaCaption: { ...node.config.mediaCaption, ar: value } })
                }
              />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Protected behavior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-md border bg-muted/40 p-3 text-muted-foreground">
              {protectedBehavior(node.type)}
            </div>
            <p className="text-xs text-muted-foreground">
              Commerce totals, stock, tenant access, and order creation remain server-controlled.
            </p>
          </CardContent>
        </Card>

        {!readOnly && node.type !== "START" ? (
          <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="size-4" />
            Delete step
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function MenuOptionsEditor({
  node,
  allNodes,
  readOnly,
  onOptionsChange,
}: {
  node: VisualFlowNode;
  allNodes: VisualFlowNode[];
  readOnly: boolean;
  onOptionsChange: (options: NonNullable<VisualFlowNode["config"]["menuOptions"]>) => void;
}) {
  const options = node.config.menuOptions ?? [];

  function update(index: number, patch: Partial<(typeof options)[number]>) {
    onOptionsChange(
      options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    );
  }

  function addOption() {
    if (options.length >= WHATSAPP_MAX_VISIBLE_OPTIONS) return;
    onOptionsChange([
      ...options,
      {
        key: `option_${Date.now()}`,
        action: "ASK_QUESTION",
        label: { en: "New option", ar: "" },
        active: true,
      },
    ]);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">WhatsApp options</CardTitle>
            <CardDescription>
              Up to three reply buttons with deterministic destinations.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={readOnly || options.length >= WHATSAPP_MAX_VISIBLE_OPTIONS}
            onClick={addOption}
          >
            <Plus className="size-4" />
            Add option
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((option, index) => (
          <div key={option.key ?? index} className="rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Button text (EN)</Label>
                <Input
                  value={option.label.en}
                  disabled={readOnly}
                  maxLength={20}
                  onChange={(event) =>
                    update(index, { label: { ...option.label, en: event.target.value } })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Button text (AR)</Label>
                <Input
                  value={option.label.ar}
                  disabled={readOnly}
                  dir="rtl"
                  maxLength={20}
                  onChange={(event) =>
                    update(index, { label: { ...option.label, ar: event.target.value } })
                  }
                />
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">After customer taps</Label>
                <Select
                  value={option.targetNodeId || "__none"}
                  disabled={readOnly}
                  onValueChange={(value) =>
                    update(index, { targetNodeId: value === "__none" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Choose destination</SelectItem>
                    {allNodes
                      .filter((candidate) => candidate.id !== node.id)
                      .map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex h-9 items-center gap-2 text-xs">
                <Switch
                  checked={option.active !== false}
                  disabled={readOnly}
                  onCheckedChange={(active) => update(index, { active })}
                />
                Active
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={readOnly}
                aria-label="Remove option"
                onClick={() =>
                  onOptionsChange(options.filter((_, optionIndex) => optionIndex !== index))
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function QuestionEditor({
  node,
  readOnly,
  patchConfig,
}: {
  node: VisualFlowNode;
  readOnly: boolean;
  patchConfig: (patch: Partial<VisualFlowNode["config"]>) => void;
}) {
  const question = node.config.question!;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Question settings</CardTitle>
        <CardDescription>Typed answers are validated before the flow continues.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <LanguageField
          label="Question (EN)"
          value={question.label.en}
          readOnly={readOnly}
          onChange={(value) =>
            patchConfig({ question: { ...question, label: { ...question.label, en: value } } })
          }
        />
        <LanguageField
          label="Question (AR)"
          value={question.label.ar}
          readOnly={readOnly}
          rtl
          onChange={(value) =>
            patchConfig({ question: { ...question, label: { ...question.label, ar: value } } })
          }
        />
        <div className="space-y-1.5">
          <Label>Answer type</Label>
          <Select
            value={question.type}
            disabled={readOnly}
            onValueChange={(type) =>
              patchConfig({ question: { ...question, type: type as typeof question.type } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short_text">Short text</SelectItem>
              <SelectItem value="long_text">Long text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="yes_no">Yes / no</SelectItem>
              <SelectItem value="single_choice">Single choice</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <Switch
            checked={question.required}
            disabled={readOnly}
            onCheckedChange={(required) => patchConfig({ question: { ...question, required } })}
          />
          Required answer
        </label>
      </CardContent>
    </Card>
  );
}

function WhatsAppPreview({
  node,
  version,
}: {
  node?: VisualFlowNode;
  version?: BusinessFlowVersionRow;
}) {
  const [language, setLanguage] = useState<"en" | "ar">("en");
  if (!node) return <EmptyFlow />;
  const text =
    node.config.messages?.[language] ||
    node.config.labels?.[language] ||
    node.config.question?.label[language] ||
    node.title;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">WhatsApp preview</CardTitle>
              <CardDescription>Real content from the currently selected step.</CardDescription>
            </div>
            <div className="flex gap-1 rounded-md border p-0.5 text-xs">
              {(["en", "ar"] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setLanguage(item)}
                  className={`rounded px-2 py-1 uppercase ${language === item ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            dir={language === "ar" ? "rtl" : "ltr"}
            className="mx-auto max-w-md space-y-2 rounded-lg bg-[#e5ddd5] p-4"
          >
            <div className="max-w-[86%] rounded-lg bg-white px-3 py-2 text-sm text-slate-900 shadow-sm">
              {node.config.mediaUrl ? (
                <img
                  src={node.config.mediaUrl}
                  alt="Message media"
                  className="mb-2 max-h-56 w-full rounded object-contain"
                />
              ) : null}
              <p className="whitespace-pre-wrap">{text}</p>
              {node.config.menuOptions?.length ? (
                <div className="mt-2 space-y-1 border-t pt-2">
                  {node.config.menuOptions
                    .filter((option) => option.active !== false)
                    .map((option) => (
                      <div
                        key={option.key}
                        className="rounded border py-1 text-center text-xs text-blue-700"
                      >
                        {option.label[language] || option.label.en}
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preview source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="rounded-md border bg-muted/40 p-3">
            {node.title} from {version?.status.toLowerCase() ?? "selected"} version v
            {version?.version_number ?? "-"}.
          </div>
          <p className="text-xs text-muted-foreground">
            A controlled end-to-end test runner is still building. This preview does not send a
            message.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ValidationPanel({
  issues,
  nodes,
  onSelectNode,
}: {
  issues: FlowValidationIssue[];
  nodes: VisualFlowNode[];
  onSelectNode: (nodeId: string) => void;
}) {
  if (!issues.length) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-5 text-sm">
          <CheckCircle2 className="size-5 text-emerald-600" />
          The current draft passes visual-flow validation.
        </CardContent>
      </Card>
    );
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return (
    <div className="space-y-3">
      {issues.map((issue, index) => (
        <Card key={`${issue.code}-${issue.nodeId ?? index}`}>
          <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-4">
            <div
              className={`grid size-8 place-items-center rounded-md ${issue.severity === "ERROR" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-800"}`}
            >
              <AlertTriangle className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={issue.severity === "ERROR" ? "destructive" : "secondary"}>
                  {issue.severity}
                </Badge>
                <span className="text-sm font-medium">
                  {issue.nodeId ? (nodeById.get(issue.nodeId)?.title ?? issue.nodeId) : "Flow"}
                </span>
              </div>
              <p className="mt-1 text-sm">{issue.message}</p>
              {issue.suggestedFix ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Suggested fix: {issue.suggestedFix}
                </p>
              ) : null}
            </div>
            {issue.nodeId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectNode(issue.nodeId!)}
              >
                Focus step
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdvancedPanel({ flow }: { flow: VisualFlowDefinition }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Canonical visual document</CardTitle>
          <CardDescription>Read-only representation of the current editor state.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[520px] overflow-auto rounded-md bg-muted/60 p-3 font-mono text-xs">
            {JSON.stringify(flow, null, 2)}
          </pre>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Later controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Badge variant="secondary">Future work</Badge>
          <p className="text-muted-foreground">
            Safe import/export, draft reset, and manual runtime tools will live here. They are
            visible now but do not mutate data.
          </p>
          <Button type="button" variant="outline" size="sm" disabled className="w-full">
            Export snapshot
          </Button>
          <Button type="button" variant="outline" size="sm" disabled className="w-full">
            Import version
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LanguageField({
  label,
  value,
  readOnly,
  rtl = false,
  onChange,
}: {
  label: string;
  value: string;
  readOnly: boolean;
  rtl?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea
        rows={4}
        value={value}
        disabled={readOnly}
        dir={rtl ? "rtl" : "ltr"}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function StepStatus({ issues }: { issues: FlowValidationIssue[] }) {
  const errors = issues.filter((issue) => issue.severity === "ERROR").length;
  if (errors)
    return (
      <Badge variant="destructive" className="ml-auto text-[9px]">
        {errors} error
      </Badge>
    );
  if (issues.length)
    return (
      <Badge variant="secondary" className="ml-auto text-[9px]">
        {issues.length} warning
      </Badge>
    );
  return (
    <Badge variant="secondary" className="ml-auto text-[9px]">
      OK
    </Badge>
  );
}

function EmptyFlow() {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-muted-foreground">
        Add a step to begin this flow.
      </CardContent>
    </Card>
  );
}

function iconForType(type: VisualFlowBlockType) {
  if (type === "START") return Zap;
  if (type === "SEND_IMAGE") return ImageIcon;
  if (type === "MAIN_MENU" || type === "LANGUAGE_SELECTION") return ListTree;
  if (type === "QUESTION" || type === "CONDITION") return GitBranch;
  if (type === "HUMAN_HANDOFF") return UserRoundCheck;
  if (type === "END") return CircleStop;
  if (
    type.includes("PRODUCT") ||
    type.includes("CART") ||
    type.includes("CHECKOUT") ||
    type.includes("ORDER")
  )
    return ShoppingCart;
  return MessageSquare;
}

function previewText(node: VisualFlowNode) {
  return (
    node.config.messages?.en ||
    node.config.labels?.en ||
    node.config.question?.label.en ||
    protectedBehavior(node.type)
  );
}

function protectedBehavior(type: VisualFlowBlockType) {
  if (type.includes("PRODUCT") || type === "CATEGORY_SELECTION")
    return "Loads trusted catalog data and validates the customer's selection.";
  if (type.includes("CART") || type === "QUANTITY")
    return "Uses the protected cart service and current stock availability.";
  if (type.includes("CHECKOUT") || type.includes("ORDER"))
    return "Uses protected checkout and order actions; flow JSON cannot override totals or inventory.";
  if (type === "HUMAN_HANDOFF")
    return "Pauses deterministic automation and requests human handling.";
  if (type === "END") return "Ends this deterministic conversation path.";
  return "Sends or routes deterministic WhatsApp content using the published flow version.";
}

function friendlyType(type: VisualFlowBlockType) {
  return type.toLowerCase().replaceAll("_", " ");
}
