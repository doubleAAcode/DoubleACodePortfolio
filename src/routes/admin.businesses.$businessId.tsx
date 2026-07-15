import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge as ReactFlowEdge,
  type Node as ReactFlowNode,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertTriangle, CheckCircle2, Circle, GripVertical, RefreshCw } from "lucide-react";
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import {
  applyAdminBusinessAction,
  getAdminBusinessDetails,
  getBusinessFlowDetails,
  getFlowTemplates,
  uploadAdminFlowImage,
} from "@/lib/whatsapp/admin-client";
import {
  applyFlowEditorModel,
  createFlowEditorModel,
  createFlowPreview,
  validateFlowForEditor,
  type FlowEditorModel,
} from "@/lib/whatsapp/flow-editor";
import type {
  AdminBusinessDetails,
  AdminBusinessStatus,
  AdminBusinessTemplate,
} from "@/lib/whatsapp/admin-store.server";
import type { WaCatalogGroupRow, WaCatalogGroupValueRow } from "@/lib/whatsapp/dashboard-store.server";
import type {
  FlowBrowseRoute,
  FlowCustomQuestion,
  FlowDefinition,
  FlowQuestionType,
} from "@/lib/whatsapp/flow-template-types";
import {
  addConfiguredVisualNode,
  addVisualNode,
  connectVisualNodes,
  getEffectiveVisualEdges,
  getVisualFlow,
  validateVisualFlow,
  visualBlockPalette,
  WHATSAPP_MAX_VISIBLE_OPTIONS,
  type VisualFlowBlockType,
  type VisualFlowDefinition,
  type VisualFlowNode,
} from "@/lib/whatsapp/visual-flow-builder";
import type {
  BusinessFlowDetails,
  FlowTemplateRow,
} from "@/lib/whatsapp/flow-template-store.server";
import type { BusinessBotFlowSettings } from "@/lib/whatsapp/bot-flow-settings.server";

export const Route = createFileRoute("/admin/businesses/$businessId")({
  component: AdminBusinessDetailPage,
});

const statuses: AdminBusinessStatus[] = [
  "DRAFT",
  "SETUP_INCOMPLETE",
  "ACTIVE",
  "PAUSED",
  "SUSPENDED",
  "ERROR",
];

const templates: AdminBusinessTemplate[] = ["ecommerce", "restaurant", "greeting_store_info"];

const templateLabels: Partial<Record<AdminBusinessTemplate, string>> = {
  ecommerce: "E-commerce",
  restaurant: "Restaurant",
  greeting_store_info: "Greeting + Store Info",
};

function AdminBusinessDetailPage() {
  const { businessId } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showingChildPage =
    pathname.endsWith("/flow-builder") ||
    pathname.endsWith("/categories") ||
    pathname.endsWith("/catalog-routes") ||
    pathname.endsWith("/catalog-route-values") ||
    pathname.endsWith("/products");
  const [details, setDetails] = useState<AdminBusinessDetails>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  const load = useCallback(() => {
    setError("");
    getAdminBusinessDetails(businessId)
      .then(setDetails)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load business."));
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  if (showingChildPage) return <Outlet />;

  async function run(label: string, action: () => Promise<AdminBusinessDetails>) {
    setSaving(label);
    setError("");
    try {
      setDetails(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin action failed.");
    } finally {
      setSaving("");
    }
  }

  if (error && !details) return <PageState text={error} />;
  if (!details) return <PageState text="Loading business..." />;

  const primaryConnection = details.connections[0];
  const businessStatus =
    details.business.status || (details.business.is_active ? "ACTIVE" : "SUSPENDED");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <a
            href="/admin/businesses"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to businesses
          </a>
          <p className="mt-5 text-xs uppercase tracking-[0.22em] text-muted-foreground">Business</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {details.business.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {details.business.id} · {details.business.currency} ·{" "}
            {details.business.timezone || "No timezone"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              disabled={saving === status || businessStatus === status}
              onClick={() =>
                void run(status, () =>
                  applyAdminBusinessAction(details.business.id, { action: "set_status", status }),
                )
              }
              className={
                businessStatus === status ? "studio-button-primary" : "studio-button-secondary"
              }
            >
              {status.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {businessStatus !== "ACTIVE" ? (
        <section className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          WhatsApp processing is blocked while this business is{" "}
          {businessStatus.replaceAll("_", " ")}.
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Health" value={details.health.status} />
        <Metric label="Products" value={details.counts.products} />
        <Metric label="Categories" value={details.counts.categories} />
        <Metric label="Orders" value={details.counts.orders} />
        <Metric label="Failed notifications" value={details.counts.failedNotifications} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-border bg-surface/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">Health checks</h2>
            <button type="button" onClick={load} className="studio-button-secondary">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {details.health.checks.map((check) => (
              <div
                key={check.code}
                className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <div className="font-medium">{check.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{check.message}</div>
                </div>
                <HealthPill status={check.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface/60 p-5">
          <h2 className="font-display text-xl font-semibold">Onboarding checklist</h2>
          <div className="mt-4 space-y-3">
            {details.checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                {item.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={item.complete ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <SeedDefaultsForm
            saving={saving}
            onSeed={(templateType) =>
              void run("seed", () =>
                applyAdminBusinessAction(details.business.id, {
                  action: "seed_defaults",
                  templateType,
                }),
              )
            }
          />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FlowSection businessId={details.business.id} saving={saving} setSaving={setSaving} />
        <ConnectionForm
          connection={primaryConnection}
          saving={saving}
          onSubmit={(connection) =>
            void run("connection", () =>
              applyAdminBusinessAction(details.business.id, {
                action: "save_connection",
                connection,
              }),
            )
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <UserForm
          users={details.users}
          saving={saving}
          onSubmit={(email, role) =>
            void run("user", () =>
              applyAdminBusinessAction(details.business.id, {
                action: "assign_user",
                email,
                role,
              }),
            )
          }
        />
      </div>

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-display text-xl font-semibold">Recent audit</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="border-b border-border py-3 font-medium">Action</th>
                <th className="border-b border-border py-3 font-medium">Target</th>
                <th className="border-b border-border py-3 font-medium">Admin</th>
                <th className="border-b border-border py-3 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {details.recentAudit.length ? (
                details.recentAudit.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 font-medium">{row.action}</td>
                    <td className="py-3 text-muted-foreground">
                      {row.target_type}
                      {row.target_id ? ` / ${row.target_id}` : ""}
                    </td>
                    <td className="py-3 text-muted-foreground">{row.admin_user_id}</td>
                    <td className="py-3 text-right text-muted-foreground">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-muted-foreground">
                    No audit activity recorded for this business.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FlowSection({
  businessId,
  saving,
  setSaving,
}: {
  businessId: string;
  saving: string;
  setSaving: (value: string) => void;
}) {
  void saving;
  void setSaving;

  return (
    <section className="rounded-lg border border-border bg-surface/60 p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="font-display text-xl font-semibold">Admin onboarding controls</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Prepare routes, route values, products, then build and publish the WhatsApp
            conversation. Owner dashboard permissions can stay secondary until the admin setup is
            stable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/admin/businesses/${businessId}/catalog-routes`}
            className="studio-button-secondary"
          >
            Manage routes
          </a>
          <a
            href={`/admin/businesses/${businessId}/catalog-route-values`}
            className="studio-button-secondary"
          >
            Manage route values
          </a>
          <a href={`/admin/businesses/${businessId}/products`} className="studio-button-secondary">
            Manage products
          </a>
          <a href={`/admin/businesses/${businessId}/flow-builder`} className="studio-button-primary">
            Open Flow builder
          </a>
        </div>
      </div>
    </section>
  );
}

/*
  const [templates, setTemplates] = useState<FlowTemplateRow[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [flowDetails, setFlowDetails] = useState<BusinessFlowDetails>();
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [editor, setEditor] = useState<FlowEditorModel>();
  const [activeTab, setActiveTab] = useState<FlowEditorTab>("general");
  const [json, setJson] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    (preferredVersionId?: string) => {
      setError("");
      return Promise.all([getFlowTemplates(), getBusinessFlowDetails(businessId)])
        .then(([templateRows, businessFlow]) => {
          const publishedTemplates = templateRows.filter(
            (template) => template.status === "PUBLISHED",
          );
          setTemplates(publishedTemplates);
          setTemplateId((current) =>
            publishedTemplates.some((template) => template.id === current)
              ? current
              : publishedTemplates[0]?.id || "",
          );
          setFlowDetails(businessFlow);
          const selectedVersion =
            businessFlow.versions.find((version) => version.id === preferredVersionId) ??
            businessFlow.versions.find((version) => version.id === selectedVersionId) ??
            businessFlow.activeVersion ??
            businessFlow.versions[0];
          setSelectedVersionId(selectedVersion?.id ?? "");
          if (selectedVersion) {
            setEditor(createFlowEditorModel(selectedVersion.flow_json));
            setJson(JSON.stringify(selectedVersion.flow_json, null, 2));
          } else {
            setEditor(undefined);
            setJson("");
          }
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Could not load flow."));
    },
    [businessId, selectedVersionId],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function run(label: string, action: () => Promise<unknown>) {
    setSaving(label);
    setError("");
    try {
      const preferredVersionId = await action();
      await load(typeof preferredVersionId === "string" ? preferredVersionId : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flow action failed.");
    } finally {
      setSaving("");
    }
  }

  const selectedVersion = flowDetails?.versions.find((version) => version.id === selectedVersionId);
  const baseFlow = selectedVersion?.flow_json;
  const formEditedFlow = baseFlow && editor ? applyFlowEditorModel(baseFlow, editor) : undefined;
  const editedFlow = formEditedFlow;
  const validation = editedFlow ? validateFlowForEditor(editedFlow) : undefined;
  const previewEn = editedFlow ? createFlowPreview(editedFlow, "en") : undefined;
  const previewAr = editedFlow ? createFlowPreview(editedFlow, "ar") : undefined;
  const visualFlowPreview = editedFlow ? getVisualFlow(editedFlow) : undefined;

  function updateEditor(updater: (current: FlowEditorModel) => FlowEditorModel) {
    setEditor((current) => (current ? updater(current) : current));
  }

  function syncAdvancedJson(nextEditor = editor) {
    if (!baseFlow || !nextEditor) return;
    setJson(JSON.stringify(applyFlowEditorModel(baseFlow, nextEditor), null, 2));
  }

  function parseAdvancedJson() {
    return JSON.parse(json) as FlowDefinition;
  }

  async function saveStructuredDraft() {
    if (!editedFlow) throw new Error("Select or clone a flow before saving.");
    await applyAdminBusinessAction(businessId, {
      action: "save_business_flow_draft",
      flowJson: editedFlow,
    });
    const latest = await getBusinessFlowDetails(businessId);
    return latest.versions.find((entry) => entry.status === "DRAFT")?.id;
  }

  return (
    <section className="rounded-lg border border-border bg-surface/60 p-5 xl:col-span-2">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="font-display text-xl font-semibold">Conversation flow</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Clone a published template, customize safe copy/toggles, then publish for new
            conversations.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            disabled={!templates.length}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {templates.length ? (
              templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))
            ) : (
              <option value="">No published templates</option>
            )}
          </select>
          <button
            type="button"
            disabled={!templateId || saving === "clone-flow"}
            onClick={() =>
              void run("clone-flow", () =>
                applyAdminBusinessAction(businessId, {
                  action: "clone_flow_template",
                  templateId,
                }),
              )
            }
            className="studio-button-secondary"
          >
            {saving === "clone-flow" ? "Cloning..." : "Clone template"}
          </button>
          <a
            href={`/admin/businesses/${businessId}/flow-builder`}
            target="_blank"
            rel="noreferrer"
            className="studio-button-primary"
          >
            Open visual builder
          </a>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!templates.length ? (
        <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          No published templates are available. Apply the flow template migration, then open Flow
          templates once to seed E-commerce, Restaurant, and Greeting + Store Info.
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-md border border-border bg-background p-4 text-sm">
          <div className="font-medium">
            {flowDetails?.flow?.name || "No business flow assigned"}
          </div>
          <div className="mt-2 space-y-2 text-muted-foreground">
            <div>Status: {flowDetails?.flow?.status || "MISSING"}</div>
            <div>Active version: {flowDetails?.activeVersion?.version_number ?? "None"}</div>
            <div>
              Drafts:{" "}
              {flowDetails?.versions.filter((version) => version.status === "DRAFT").length ?? 0}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {flowDetails?.versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => {
                  setSelectedVersionId(version.id);
                  setEditor(createFlowEditorModel(version.flow_json));
                  setJson(JSON.stringify(version.flow_json, null, 2));
                }}
                className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition hover:bg-surface-2 ${
                  selectedVersionId === version.id
                    ? "border-primary bg-primary/10"
                    : "border-border"
                }`}
              >
                Version {version.version_number} · {version.status}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0 overflow-hidden">
          {editor && editedFlow ? (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {flowEditorTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      syncAdvancedJson();
                      setActiveTab(tab.id);
                    }}
                    className={
                      activeTab === tab.id ? "studio-button-primary" : "studio-button-secondary"
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "general" ? (
                <GeneralFlowEditor editor={editor} onChange={updateEditor} />
              ) : null}
              {activeTab === "steps" && visualFlowPreview ? (
                <FlowStepsOverview visualFlow={visualFlowPreview} />
              ) : null}
              {activeTab === "copy" ? (
                <CopyFlowEditor editor={editor} onChange={updateEditor} />
              ) : null}
              {activeTab === "menu" ? (
                <MainMenuFlowEditor
                  editor={editor}
                  nodes={editedFlow.nodes}
                  onChange={updateEditor}
                />
              ) : null}
              {activeTab === "store" ? (
                <StoreInfoFlowEditor editor={editor} onChange={updateEditor} />
              ) : null}
              {activeTab === "ordering" ? (
                <OrderingFlowEditor editor={editor} onChange={updateEditor} />
              ) : null}
              {activeTab === "checkout" ? (
                <CheckoutFlowEditor editor={editor} onChange={updateEditor} />
              ) : null}
              {activeTab === "questions" ? (
                <CustomQuestionsFlowEditor editor={editor} onChange={updateEditor} />
              ) : null}
              {activeTab === "handoff" ? (
                <HandoffFlowEditor editor={editor} onChange={updateEditor} />
              ) : null}
              {activeTab === "preview" ? (
                <PreviewFlowEditor previewEn={previewEn} previewAr={previewAr} />
              ) : null}
              {activeTab === "validation" ? <ValidationPanel validation={validation} /> : null}
              {activeTab === "advanced" ? (
                <AdvancedJsonEditor
                  value={json}
                  onChange={setJson}
                  onSync={() => syncAdvancedJson()}
                />
              ) : null}
            </>
          ) : (
            <div className="rounded-md border border-border bg-background p-5 text-sm text-muted-foreground">
              Clone a template before editing this business flow.
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!editedFlow || saving === "flow-draft"}
              onClick={() =>
                void run("flow-draft", async () =>
                  activeTab === "advanced"
                    ? saveAdvancedJsonDraft(businessId, parseAdvancedJson)
                    : saveStructuredDraft(),
                )
              }
              className="studio-button-secondary"
            >
              {saving === "flow-draft" ? "Saving..." : "Save draft"}
            </button>
            <button
              type="button"
              disabled={!editedFlow || saving === "flow-publish" || validation?.ok === false}
              onClick={() => {
                void run("flow-publish", async () => {
                  await (activeTab === "advanced"
                    ? saveAdvancedJsonDraft(businessId, parseAdvancedJson)
                    : saveStructuredDraft());
                  const latest = await getBusinessFlowDetails(businessId);
                  const draft = latest.versions.find((entry) => entry.status === "DRAFT");
                  if (!draft) throw new Error("No draft version was available to publish.");
                  await applyAdminBusinessAction(businessId, {
                    action: "publish_business_flow",
                    versionId: draft.id,
                  });
                  return draft.id;
                });
              }}
              className="studio-button-primary"
            >
              {saving === "flow-publish" ? "Publishing..." : "Publish selected"}
            </button>
            {validation ? (
              <span
                className={`self-center text-sm ${
                  validation.ok ? "text-primary" : "text-destructive"
                }`}
              >
                {validation.ok ? "Valid draft" : "Fix validation errors before publishing"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
*/

type FlowEditorTab =
  | "general"
  | "steps"
  | "copy"
  | "menu"
  | "store"
  | "ordering"
  | "checkout"
  | "questions"
  | "handoff"
  | "preview"
  | "validation"
  | "advanced";

const flowEditorTabs: Array<{ id: FlowEditorTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "steps", label: "Steps" },
  { id: "copy", label: "Languages" },
  { id: "menu", label: "Main menu" },
  { id: "store", label: "Store info" },
  { id: "ordering", label: "Ordering" },
  { id: "checkout", label: "Checkout" },
  { id: "questions", label: "Questions" },
  { id: "handoff", label: "Handoff" },
  { id: "preview", label: "Preview" },
  { id: "validation", label: "Validation" },
  { id: "advanced", label: "Advanced JSON" },
];

type BuilderMode = "conversation" | "test" | "advanced";

const builderModes: Array<{
  id: BuilderMode;
  label: string;
  description: string;
}> = [
  {
    id: "conversation",
    label: "Conversation map",
    description: "Edit the WhatsApp path customers follow.",
  },
  {
    id: "test",
    label: "Test",
    description: "Preview paths and fix validation issues.",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Developer canvas and raw JSON.",
  },
];

export function VisualFlowBuilderEditor({
  businessId,
  visualFlow,
  selectedBlockId,
  validation,
  fullHeight = false,
  botFlowSettings,
  catalogGroups = [],
  catalogGroupValues = [],
  checkoutSaving = false,
  orderConfirmationEnglish,
  orderConfirmationArabic,
  onSelectBlock,
  onChange,
  onBotFlowSettingsChange,
  onOrderConfirmationEnglishChange,
  onOrderConfirmationArabicChange,
  onSaveCheckoutSettings,
}: {
  visualFlow: VisualFlowDefinition;
  businessId?: string;
  selectedBlockId: string;
  validation?: ReturnType<typeof validateVisualFlow>;
  fullHeight?: boolean;
  botFlowSettings?: BusinessBotFlowSettings;
  catalogGroups?: WaCatalogGroupRow[];
  catalogGroupValues?: WaCatalogGroupValueRow[];
  checkoutSaving?: boolean;
  orderConfirmationEnglish?: string;
  orderConfirmationArabic?: string;
  onSelectBlock: (blockId: string) => void;
  onChange: (visualFlow: VisualFlowDefinition) => void;
  onBotFlowSettingsChange?: (settings: BusinessBotFlowSettings) => void;
  onOrderConfirmationEnglishChange?: (value: string) => void;
  onOrderConfirmationArabicChange?: (value: string) => void;
  onSaveCheckoutSettings?: () => void;
}) {
  const selectedBlock =
    visualFlow.nodes.find((node) => node.id === selectedBlockId) ??
    visualFlow.nodes.find((node) => node.type === "START") ??
    visualFlow.nodes[0];
  const effectiveEdges = getEffectiveVisualEdges(visualFlow);
  const [showAddStep, setShowAddStep] = useState(false);
  const [panelWidths, setPanelWidths] = useState({ outline: 300, settings: 380 });
  const [builderMode, setBuilderMode] = useState<BuilderMode>("conversation");

  function updateNode(node: VisualFlowNode) {
    onChange({
      ...visualFlow,
      nodes: visualFlow.nodes.map((entry) => (entry.id === node.id ? node : entry)),
    });
  }

  function startPanelResize(panel: "outline" | "settings", startEvent: ReactPointerEvent) {
    if (!fullHeight) return;
    const startX = startEvent.clientX;
    const initialWidth = panelWidths[panel];
    startEvent.currentTarget.setPointerCapture(startEvent.pointerId);
    const onPointerMove = (event: PointerEvent) => {
      const delta = event.clientX - startX;
      const nextWidth = initialWidth + (panel === "outline" ? delta : -delta);
      setPanelWidths((current) => ({
        ...current,
        [panel]: Math.min(
          panel === "outline" ? 720 : 760,
          Math.max(panel === "outline" ? 220 : 300, nextWidth),
        ),
      }));
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  const builderGridStyle: CSSProperties | undefined = fullHeight
    ? {
        gridTemplateColumns: `${panelWidths.outline}px 18px minmax(360px, 1fr) 18px ${panelWidths.settings}px`,
      }
    : undefined;

  const buildModeGrid = (
    <div
      style={builderGridStyle}
      className={
        fullHeight
          ? "grid h-full min-h-0 min-w-0 gap-0"
          : "grid min-w-0 gap-4 xl:grid-cols-[180px_minmax(0,1fr)]"
      }
    >
      <div className="min-h-0 overflow-y-auto rounded-md border border-border bg-background p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Conversation outline</div>
            <div className="text-xs text-muted-foreground">
              Readable order for the WhatsApp flow.
            </div>
          </div>
          <button
            type="button"
            className="studio-button-primary px-3 py-1.5 text-xs"
            onClick={() => setShowAddStep((value) => !value)}
          >
            Add step
          </button>
        </div>
        {showAddStep ? (
          <GuidedAddStepWizard
            visualFlow={visualFlow}
            selectedBlockId={selectedBlock?.id ?? selectedBlockId}
            onCancel={() => setShowAddStep(false)}
            onCreate={(next, createdNodeId) => {
              onChange(next);
              onSelectBlock(createdNodeId);
              setShowAddStep(false);
            }}
          />
        ) : null}
        <ConversationOutline
          nodes={visualFlow.nodes}
          validation={validation}
          selectedBlockId={selectedBlockId}
          onSelect={onSelectBlock}
        />
        <details className="mt-4 rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">Advanced block palette</summary>
          <div className="mt-3 space-y-2">
            {visualBlockPalette.map((block) => (
              <button
                key={block.type}
                type="button"
                draggable
                onDragStart={(event) => event.dataTransfer.setData("blockType", block.type)}
                onClick={() => onChange(addVisualNode(visualFlow, block.type))}
                className="block w-full rounded-md border border-border px-3 py-2 text-left text-xs transition hover:border-primary"
              >
                <span className="block font-medium">{friendlyBlockName(block.type)}</span>
                <span className="text-muted-foreground">{block.type}</span>
              </button>
            ))}
          </div>
        </details>
      </div>

      {fullHeight ? (
        <button
          type="button"
          aria-label="Resize conversation outline panel"
          title="Drag to resize outline"
          className="group mx-1 flex h-full cursor-col-resize items-center justify-center rounded-md border border-border bg-surface/70 text-muted-foreground transition hover:border-primary hover:bg-primary/15 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          onPointerDown={(event) => startPanelResize("outline", event)}
        >
          <GripVertical className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-col rounded-md border border-border bg-background p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Canvas</div>
            <div className="text-xs text-muted-foreground">
              Visual overview. Editing happens in the outline and settings panel.
            </div>
          </div>
          <div className={validation?.ok ? "text-xs text-primary" : "text-xs text-destructive"}>
            {validation?.ok ? "Visual flow valid" : "Visual flow has issues"}
          </div>
        </div>

        <FlowGraphCanvas
          visualFlow={visualFlow}
          effectiveEdges={effectiveEdges}
          selectedBlockId={selectedBlockId}
          fullHeight={fullHeight}
          onSelectBlock={onSelectBlock}
          onChange={onChange}
        />

        <p className="mt-3 text-xs text-muted-foreground">
          Menu, question, and condition connections are generated from block settings.
        </p>
      </div>

      {fullHeight ? (
        <button
          type="button"
          aria-label="Resize step settings panel"
          title="Drag to resize settings"
          className="group mx-1 flex h-full cursor-col-resize items-center justify-center rounded-md border border-border bg-surface/70 text-muted-foreground transition hover:border-primary hover:bg-primary/15 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          onPointerDown={(event) => startPanelResize("settings", event)}
        >
          <GripVertical className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      <div
        className={
          fullHeight
            ? "min-h-0 min-w-0 overflow-y-auto rounded-md border border-border bg-background p-3"
            : "min-w-0 rounded-md border border-border bg-background p-3 xl:col-span-2"
        }
      >
        <div className="text-sm font-medium">Step settings</div>
        {selectedBlock ? (
          <div className="mt-3 space-y-3">
            <StepExplanation block={selectedBlock} />
            <TextField
              label="Title"
              value={selectedBlock.title}
              onChange={(value) => updateNode({ ...selectedBlock, title: value })}
            />
            <BusinessBlockSettings
              block={selectedBlock}
              nodes={visualFlow.nodes}
              visualFlow={visualFlow}
              businessId={businessId}
              onChange={updateNode}
              onFlowChange={onChange}
            />
            <WhatsAppStepPreview block={selectedBlock} />
            <StepRunPreview visualFlow={visualFlow} selectedBlockId={selectedBlock.id} />
            <button
              type="button"
              className="studio-button-secondary"
              onClick={() =>
                onChange({
                  ...visualFlow,
                  nodes: visualFlow.nodes.filter((node) => node.id !== selectedBlock.id),
                  edges: visualFlow.edges.filter(
                    (edge) =>
                      edge.sourceNodeId !== selectedBlock.id &&
                      edge.targetNodeId !== selectedBlock.id,
                  ),
                })
              }
            >
              Delete block
            </button>
            <AdvancedManualConnections
              selectedBlock={selectedBlock}
              visualFlow={visualFlow}
              onChange={onChange}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Select a block to edit settings.</p>
        )}

        {validation?.issues.length ? (
          <div className="mt-4 space-y-2">
            {validation.issues.slice(0, 6).map((issue, index) => (
              <div
                key={`${issue.code}-${index}`}
                className="rounded-md border border-border p-2 text-xs"
              >
                <span
                  className={issue.severity === "ERROR" ? "text-destructive" : "text-amber-200"}
                >
                  {issue.severity}
                </span>{" "}
                {humanizeValidationIssue(issue.message)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!fullHeight) {
    return (
      <ConfigureFlowMode
        visualFlow={visualFlow}
        selectedBlock={selectedBlock}
        selectedBlockId={selectedBlockId}
        validation={validation}
        onAddStep={(next) => {
          onChange(next);
        }}
        onSelectBlock={onSelectBlock}
        onUpdateNode={updateNode}
        onChange={onChange}
        catalogGroups={catalogGroups}
        catalogGroupValues={catalogGroupValues}
        businessId={businessId}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <BuilderModeTabs value={builderMode} onChange={setBuilderMode} />
      {builderMode === "conversation" ? (
        <ConfigureFlowMode
          visualFlow={visualFlow}
          selectedBlock={selectedBlock}
          selectedBlockId={selectedBlockId}
          validation={validation}
          onAddStep={(next) => {
            onChange(next);
          }}
          onSelectBlock={onSelectBlock}
          onUpdateNode={updateNode}
          onChange={onChange}
          botFlowSettings={botFlowSettings}
          catalogGroups={catalogGroups}
          catalogGroupValues={catalogGroupValues}
          businessId={businessId}
          checkoutSaving={checkoutSaving}
          orderConfirmationEnglish={orderConfirmationEnglish}
          orderConfirmationArabic={orderConfirmationArabic}
          onBotFlowSettingsChange={onBotFlowSettingsChange}
          onOrderConfirmationEnglishChange={onOrderConfirmationEnglishChange}
          onOrderConfirmationArabicChange={onOrderConfirmationArabicChange}
          onSaveCheckoutSettings={onSaveCheckoutSettings}
        />
      ) : null}
      {builderMode === "test" ? (
        <TestFlowMode
          visualFlow={visualFlow}
          selectedBlockId={selectedBlock.id}
          validation={validation}
        />
      ) : null}
      {builderMode === "advanced" ? (
        <AdvancedVisualFlowMode
          graphTools={buildModeGrid}
          visualFlow={visualFlow}
          validation={validation}
        />
      ) : null}
    </div>
  );
}

function FlowGraphCanvas({
  visualFlow,
  effectiveEdges,
  selectedBlockId,
  fullHeight,
  onSelectBlock,
  onChange,
}: {
  visualFlow: VisualFlowDefinition;
  effectiveEdges: ReturnType<typeof getEffectiveVisualEdges>;
  selectedBlockId: string;
  fullHeight: boolean;
  onSelectBlock: (blockId: string) => void;
  onChange: (visualFlow: VisualFlowDefinition) => void;
}) {
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<ReactFlowNode, ReactFlowEdge>>();
  const graphNodes: ReactFlowNode[] = visualFlow.nodes.map((node) => ({
    id: node.id,
    position: node.position,
    selected: selectedBlockId === node.id,
    data: {
      label: (
        <div className="min-w-[180px] text-left text-xs">
          <div className="font-medium">{node.title || friendlyBlockName(node.type)}</div>
          <div className="mt-1 text-muted-foreground">{friendlyBlockName(node.type)}</div>
          <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
            {visualBlockSummary(node)}
          </div>
        </div>
      ),
    },
    style: {
      width: 210,
      borderRadius: 8,
      border:
        selectedBlockId === node.id
          ? "1px solid color-mix(in oklch, var(--primary) 80%, white 8%)"
          : "1px solid var(--border)",
      background:
        selectedBlockId === node.id
          ? "color-mix(in oklch, var(--surface-2) 72%, var(--primary) 28%)"
          : "var(--background)",
      color: "var(--foreground)",
      boxShadow: "0 14px 32px oklch(0 0 0 / 0.32)",
    },
  }));
  const graphEdges: ReactFlowEdge[] = effectiveEdges.map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    label: humanRouteLabel(edge.condition ?? edge.label),
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: "color-mix(in oklch, var(--primary) 72%, var(--foreground) 20%)",
      strokeWidth: 2.5,
    },
    labelStyle: { fill: "var(--foreground)", fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: "var(--background)", fillOpacity: 0.92 },
  }));

  function updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    onChange({
      ...visualFlow,
      nodes: visualFlow.nodes.map((node) =>
        node.id === nodeId ? { ...node, position, updatedAt: new Date().toISOString() } : node,
      ),
    });
  }

  function connectBlocks(connection: Connection) {
    if (!connection.source || !connection.target) return;
    const source = visualFlow.nodes.find((node) => node.id === connection.source);
    if (!source) return;
    if (source.type === "START") {
      updateSourceNodeConfig(source.id, {
        ...source.config,
        startBehavior: "custom_step",
        messageNextNodeId: connection.target,
      });
      return;
    }
    if (source.type === "MAIN_MENU" || source.config.messageBehavior === "options") {
      const options = source.config.menuOptions ?? [];
      updateSourceNodeConfig(source.id, {
        ...source.config,
        messageBehavior: source.type === "MAIN_MENU" ? source.config.messageBehavior : "options",
        menuOptions: [
          ...options,
          {
            key: `option_${options.length + 1}`,
            label: { en: "New option", ar: "خيار جديد" },
            targetNodeId: connection.target,
            active: true,
          },
        ],
      });
      return;
    }
    if (source.type === "QUESTION") {
      updateSourceNodeConfig(source.id, {
        ...source.config,
        questionNextNodeId: connection.target,
      });
      return;
    }
    if (source.type === "CONDITION") {
      updateSourceNodeConfig(source.id, {
        ...source.config,
        conditionFallbackNodeId: connection.target,
      });
      return;
    }
    if (source.type === "SEND_MESSAGE" || source.config.messageBehavior) {
      updateSourceNodeConfig(source.id, {
        ...source.config,
        messageBehavior: "next",
        messageNextNodeId: connection.target,
      });
      return;
    }
    onChange(connectVisualNodes(visualFlow, connection.source, connection.target));
  }

  function updateSourceNodeConfig(nodeId: string, config: VisualFlowNode["config"]) {
    onChange({
      ...visualFlow,
      nodes: visualFlow.nodes.map((node) => (node.id === nodeId ? { ...node, config } : node)),
    });
  }

  function deleteEdges(edges: ReactFlowEdge[]) {
    let nextFlow = { ...visualFlow };
    for (const deletedEdge of edges) {
      const visualEdge = effectiveEdges.find((edge) => edge.id === deletedEdge.id);
      if (!visualEdge) continue;
      nextFlow = {
        ...nextFlow,
        edges: nextFlow.edges.filter((edge) => edge.id !== deletedEdge.id),
        nodes: nextFlow.nodes.map((node) =>
          node.id === visualEdge.sourceNodeId
            ? disconnectGeneratedEdge(node, visualEdge.targetNodeId, visualEdge.condition)
            : node,
        ),
      };
    }
    onChange(nextFlow);
  }

  return (
    <div
      className={
        fullHeight
          ? "flow-builder-graph mt-3 min-h-0 flex-1 max-w-full overflow-hidden rounded-md border border-border"
          : "flow-builder-graph mt-3 h-[560px] max-w-full overflow-hidden rounded-md border border-border"
      }
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const blockType = event.dataTransfer.getData("blockType") as VisualFlowBlockType;
        if (!blockType) return;
        const position = flowInstance?.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }) ?? { x: 120, y: 120 };
        const next = addVisualNode(visualFlow, blockType);
        onChange({
          ...next,
          nodes: next.nodes.map((node, index) =>
            index === next.nodes.length - 1 ? { ...node, position } : node,
          ),
        });
      }}
    >
      <ReactFlow
        nodes={graphNodes}
        edges={graphEdges}
        onInit={setFlowInstance}
        onNodeClick={(_, node) => onSelectBlock(node.id)}
        onNodeDragStop={(_, node) => updateNodePosition(node.id, node.position)}
        onConnect={connectBlocks}
        onEdgesDelete={deleteEdges}
        fitView
        fitViewOptions={{ padding: 0.12, minZoom: 0.78, maxZoom: 1.05 }}
        minZoom={0.45}
        maxZoom={1.8}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={["Backspace", "Delete"]}
        colorMode="dark"
      >
        <Background
          color="color-mix(in oklch, var(--border) 70%, var(--foreground) 10%)"
          gap={24}
          size={1}
        />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor="color-mix(in oklch, var(--primary) 50%, var(--surface-2) 50%)"
          nodeStrokeColor="var(--border)"
          maskColor="oklch(0 0 0 / 0.42)"
          bgColor="var(--background)"
        />
      </ReactFlow>
    </div>
  );
}

function disconnectGeneratedEdge(
  node: VisualFlowNode,
  targetNodeId: string,
  condition: string | null,
): VisualFlowNode {
  if (node.type === "START" && node.config.messageNextNodeId === targetNodeId) {
    return { ...node, config: { ...node.config, messageNextNodeId: undefined } };
  }
  if (node.config.menuOptions?.length) {
    return {
      ...node,
      config: {
        ...node.config,
        menuOptions: node.config.menuOptions.map((option) =>
          option.targetNodeId === targetNodeId &&
          (condition === option.key || condition === option.action)
            ? { ...option, targetNodeId: undefined }
            : option,
        ),
      },
    };
  }
  if (node.type === "QUESTION") {
    return {
      ...node,
      config: {
        ...node.config,
        questionNextNodeId:
          condition === "answer" && node.config.questionNextNodeId === targetNodeId
            ? undefined
            : node.config.questionNextNodeId,
        questionFallbackNodeId:
          condition === "fallback" && node.config.questionFallbackNodeId === targetNodeId
            ? undefined
            : node.config.questionFallbackNodeId,
      },
    };
  }
  if (node.type === "CONDITION") {
    return {
      ...node,
      config: {
        ...node.config,
        conditionRules: (node.config.conditionRules ?? []).map((rule) =>
          rule.targetNodeId === targetNodeId ? { ...rule, targetNodeId: undefined } : rule,
        ),
        conditionFallbackNodeId:
          condition === "fallback" && node.config.conditionFallbackNodeId === targetNodeId
            ? undefined
            : node.config.conditionFallbackNodeId,
      },
    };
  }
  if (node.config.messageNextNodeId === targetNodeId) {
    return { ...node, config: { ...node.config, messageNextNodeId: undefined } };
  }
  return node;
}

function replaceSingleVisualConnection(
  visualFlow: VisualFlowDefinition,
  sourceNodeId: string,
  targetNodeId: string,
): VisualFlowDefinition {
  const withoutExisting = {
    ...visualFlow,
    edges: visualFlow.edges.filter((edge) => edge.sourceNodeId !== sourceNodeId),
  };
  return targetNodeId
    ? connectVisualNodes(withoutExisting, sourceNodeId, targetNodeId)
    : withoutExisting;
}

function BuilderModeTabs({
  value,
  onChange,
}: {
  value: BuilderMode;
  onChange: (mode: BuilderMode) => void;
}) {
  return (
    <div className="shrink-0 rounded-md border border-border bg-background p-2">
      <div className="grid gap-2 md:grid-cols-3">
        {builderModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={`rounded-md border px-3 py-2 text-left transition ${
              value === mode.id
                ? "border-primary bg-primary/15"
                : "border-border hover:border-primary/70"
            }`}
          >
            <span className="block text-sm font-medium">{mode.label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{mode.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigureFlowMode({
  visualFlow,
  selectedBlock,
  selectedBlockId,
  validation,
  businessId,
  botFlowSettings,
  catalogGroups,
  catalogGroupValues,
  checkoutSaving,
  orderConfirmationEnglish,
  orderConfirmationArabic,
  onAddStep,
  onSelectBlock,
  onUpdateNode,
  onChange,
  onBotFlowSettingsChange,
  onOrderConfirmationEnglishChange,
  onOrderConfirmationArabicChange,
  onSaveCheckoutSettings,
}: {
  visualFlow: VisualFlowDefinition;
  selectedBlock?: VisualFlowNode;
  selectedBlockId: string;
  validation?: ReturnType<typeof validateVisualFlow>;
  businessId?: string;
  botFlowSettings?: BusinessBotFlowSettings;
  catalogGroups?: WaCatalogGroupRow[];
  catalogGroupValues?: WaCatalogGroupValueRow[];
  checkoutSaving?: boolean;
  orderConfirmationEnglish?: string;
  orderConfirmationArabic?: string;
  onAddStep: (flow: VisualFlowDefinition) => void;
  onSelectBlock: (blockId: string) => void;
  onUpdateNode: (node: VisualFlowNode) => void;
  onChange: (flow: VisualFlowDefinition) => void;
  onBotFlowSettingsChange?: (settings: BusinessBotFlowSettings) => void;
  onOrderConfirmationEnglishChange?: (value: string) => void;
  onOrderConfirmationArabicChange?: (value: string) => void;
  onSaveCheckoutSettings?: () => void;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(560px,1fr)_390px_minmax(380px,460px)] 2xl:grid-cols-[minmax(640px,1fr)_430px_minmax(440px,560px)]">
      <div className="min-h-0 overflow-y-auto rounded-md border border-border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">WhatsApp conversation map</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Read the customer journey from left to right. Branches appear under option and menu
              steps.
            </div>
          </div>
        </div>
        <ConversationMap
          visualFlow={visualFlow}
          effectiveEdges={getEffectiveVisualEdges(visualFlow)}
          selectedBlockId={selectedBlockId}
          businessId={businessId}
          onSelectBlock={onSelectBlock}
          onChange={onChange}
          onCreateStep={(next, createdNodeId) => {
            onAddStep(next);
            onSelectBlock(createdNodeId);
          }}
        />
      </div>

      <StepSettingsColumn
        visualFlow={visualFlow}
        selectedBlock={selectedBlock}
        validation={validation}
        botFlowSettings={botFlowSettings}
        catalogGroups={catalogGroups ?? []}
        catalogGroupValues={catalogGroupValues ?? []}
        businessId={businessId}
        checkoutSaving={checkoutSaving}
        orderConfirmationEnglish={orderConfirmationEnglish}
        orderConfirmationArabic={orderConfirmationArabic}
        onUpdateNode={onUpdateNode}
        onChange={onChange}
        onSelectBlock={onSelectBlock}
        onBotFlowSettingsChange={onBotFlowSettingsChange}
        onOrderConfirmationEnglishChange={onOrderConfirmationEnglishChange}
        onOrderConfirmationArabicChange={onOrderConfirmationArabicChange}
        onSaveCheckoutSettings={onSaveCheckoutSettings}
      />
      <LivePreviewColumn
        visualFlow={visualFlow}
        selectedBlock={selectedBlock}
        botFlowSettings={botFlowSettings}
        orderConfirmationEnglish={orderConfirmationEnglish}
        orderConfirmationArabic={orderConfirmationArabic}
      />
    </div>
  );
}

function ConversationMap({
  visualFlow,
  effectiveEdges,
  selectedBlockId,
  businessId,
  onSelectBlock,
  onChange,
  onCreateStep,
}: {
  visualFlow: VisualFlowDefinition;
  effectiveEdges: ReturnType<typeof getEffectiveVisualEdges>;
  selectedBlockId: string;
  businessId?: string;
  onSelectBlock: (blockId: string) => void;
  onChange: (flow: VisualFlowDefinition) => void;
  onCreateStep: (flow: VisualFlowDefinition, createdNodeId: string) => void;
}) {
  const [addTarget, setAddTarget] = useState<{
    sourceNodeId: string;
    mode: "next" | "option";
    optionKey?: string;
    optionLabel?: string;
    nextNodeId?: string;
  }>();
  const [focusedOption, setFocusedOption] = useState<{
    sourceNodeId: string;
    optionKey: string;
  }>();
  const [showFirstStepWizard, setShowFirstStepWizard] = useState(false);
  const nodeById = new Map(visualFlow.nodes.map((node) => [node.id, node]));
  const startNode = visualFlow.nodes.find((node) => node.type === "START") ?? visualFlow.nodes[0];
  const visited = new Set<string>();
  const primaryPath: VisualFlowNode[] = [];
  let current: VisualFlowNode | undefined = startNode;

  while (current && !visited.has(current.id)) {
    primaryPath.push(current);
    visited.add(current.id);
    const nextEdge = primaryNextEdge(current.id, effectiveEdges);
    current = nextEdge ? nodeById.get(nextEdge.targetNodeId) : undefined;
  }

  const unvisitedNodes = visualFlow.nodes.filter(
    (node) => !visited.has(node.id) && !isLegacyCommerceInternalNode(node),
  );
  const updateFocusedOption = (
    sourceNodeId: string,
    optionKey: string,
    updater: (option: VisualMenuOption) => VisualMenuOption,
  ) => {
    onChange({
      ...visualFlow,
      nodes: visualFlow.nodes.map((node) =>
        node.id === sourceNodeId
          ? {
              ...node,
              config: {
                ...node.config,
                menuOptions: (node.config.menuOptions ?? []).map((option) =>
                  option.key === optionKey ? updater(option) : option,
                ),
              },
            }
          : node,
      ),
    });
  };
  const deleteFocusedOption = (sourceNodeId: string, optionKey: string) => {
    onChange({
      ...visualFlow,
      nodes: visualFlow.nodes.map((node) =>
        node.id === sourceNodeId
          ? {
              ...node,
              config: {
                ...node.config,
                menuOptions: (node.config.menuOptions ?? []).filter(
                  (option) => option.key !== optionKey,
                ),
              },
            }
          : node,
      ),
    });
    setFocusedOption(undefined);
  };

  if (focusedOption) {
    return (
      <div className="mt-5 min-w-0">
        <FocusedBranchCanvas
          visualFlow={visualFlow}
          edges={effectiveEdges}
          selectedBlockId={selectedBlockId}
          focusedOption={focusedOption}
          onBack={() => setFocusedOption(undefined)}
          onSelectBlock={onSelectBlock}
          onOpenOption={(sourceNodeId, optionKey) => setFocusedOption({ sourceNodeId, optionKey })}
          onAddAfterNode={(sourceNodeId, nextNodeId) =>
            setAddTarget({ sourceNodeId, mode: "next", nextNodeId })
          }
          onAddOption={(sourceNodeId) => setAddTarget({ sourceNodeId, mode: "option" })}
          onAddOptionTarget={(sourceNodeId, optionKey, optionLabel) =>
            setAddTarget({
              sourceNodeId,
              mode: "option",
              optionKey,
              optionLabel,
            })
          }
          onCreateOptionTarget={(next, createdNodeId) => {
            onCreateStep(next, createdNodeId);
            onSelectBlock(createdNodeId);
          }}
          onUpdateOption={updateFocusedOption}
          onDeleteOption={deleteFocusedOption}
          onChange={onChange}
          businessId={businessId}
        />
        {addTarget ? (
          <InlineAddStepCard
            visualFlow={visualFlow}
            sourceNodeId={addTarget.sourceNodeId}
            mode={addTarget.mode}
            optionKey={addTarget.optionKey}
            optionLabel={addTarget.optionLabel}
            nextNodeId={addTarget.nextNodeId}
            onCancel={() => setAddTarget(undefined)}
            onCreate={(next, createdNodeId) => {
              setAddTarget(undefined);
              onCreateStep(next, createdNodeId);
            }}
          />
        ) : null}
      </div>
    );
  }

  if (!primaryPath.length) {
    return (
      <div className="mt-5 min-w-0">
        <div className="rounded-md border border-dashed border-primary/50 bg-primary/5 p-6">
          <div className="max-w-xl">
            <div className="font-display text-xl font-semibold">Start from a blank canvas</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Add the first WhatsApp block, then keep adding the next block one by one.
            </p>
            <button
              type="button"
              className="studio-button-primary mt-4"
              onClick={() => setShowFirstStepWizard((value) => !value)}
            >
              Add first block
            </button>
          </div>
          {showFirstStepWizard ? (
            <GuidedAddStepWizard
              visualFlow={visualFlow}
              selectedBlockId=""
              defaultKind="options"
              onCancel={() => setShowFirstStepWizard(false)}
              onCreate={(next, createdNodeId) => {
                setShowFirstStepWizard(false);
                onCreateStep(next, createdNodeId);
              }}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 min-w-0">
      <div className="overflow-x-auto rounded-md border border-border bg-surface/20 p-4 pb-5">
        <div className="flex min-w-max items-start gap-4">
          {primaryPath.map((node, index) => (
            <div key={node.id} className="flex items-start gap-4">
              <ConversationMapBlock
                node={node}
                nodes={visualFlow.nodes}
                edges={effectiveEdges}
                selectedBlockId={selectedBlockId}
                selected={selectedBlockId === node.id}
                onSelectBlock={onSelectBlock}
                onAddOption={() => setAddTarget({ sourceNodeId: node.id, mode: "option" })}
                onAddOptionTarget={(optionKey, optionLabel) =>
                  setAddTarget({
                    sourceNodeId: node.id,
                    mode: "option",
                    optionKey,
                    optionLabel,
                  })
                }
                onOpenOption={(optionKey) => setFocusedOption({ sourceNodeId: node.id, optionKey })}
              />
              <div className="flex min-h-[140px] flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  title={
                    index === primaryPath.length - 1
                      ? "Add the next step after this block"
                      : "Insert a step between these blocks"
                  }
                  aria-label={
                    index === primaryPath.length - 1
                      ? "Add the next step after this block"
                      : "Insert a step between these blocks"
                  }
                  onClick={() =>
                    setAddTarget({
                      sourceNodeId: node.id,
                      mode: "next",
                      nextNodeId: primaryPath[index + 1]?.id,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="text-base leading-none">+</span>
                  {index === primaryPath.length - 1 ? "Add next step" : "Insert step"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {addTarget ? (
          <InlineAddStepCard
            visualFlow={visualFlow}
            sourceNodeId={addTarget.sourceNodeId}
            mode={addTarget.mode}
            optionKey={addTarget.optionKey}
            optionLabel={addTarget.optionLabel}
            nextNodeId={addTarget.nextNodeId}
            onCancel={() => setAddTarget(undefined)}
            onCreate={(next, createdNodeId) => {
              setAddTarget(undefined);
              onCreateStep(next, createdNodeId);
            }}
          />
        ) : null}
      </div>
      {unvisitedNodes.length ? (
        <details className="mt-3 rounded-md border border-border bg-surface/30 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Other available steps ({unvisitedNodes.length})
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {unvisitedNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectBlock(node.id)}
                className={`rounded-md border p-3 text-left text-sm transition ${
                  selectedBlockId === node.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/70"
                }`}
              >
                <span className="block font-medium">
                  {node.title || friendlyBlockName(node.type)}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {visualBlockSummary(node)}
                </span>
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ConversationMapBlock({
  node,
  nodes,
  edges,
  selectedBlockId,
  selected,
  onSelectBlock,
  onAddOption,
  onAddOptionTarget,
  onOpenOption,
}: {
  node: VisualFlowNode;
  nodes: VisualFlowNode[];
  edges: ReturnType<typeof getEffectiveVisualEdges>;
  selectedBlockId: string;
  selected: boolean;
  onSelectBlock: (blockId: string) => void;
  onAddOption: () => void;
  onAddOptionTarget: (optionKey: string, optionLabel: string) => void;
  onOpenOption: (optionKey: string) => void;
}) {
  const outgoing = edges
    .filter((edge) => edge.sourceNodeId === node.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const branchRoutes = optionRoutesForNode(node, nodes, outgoing);
  const canAddOptionBranch = branchRoutes.length < WHATSAPP_MAX_VISIBLE_OPTIONS;

  return (
    <div className="w-[260px]">
      <button
        type="button"
        onClick={() => onSelectBlock(node.id)}
        className={`block min-h-[130px] w-full rounded-md border p-4 text-left text-sm shadow-sm transition ${
          selected
            ? "border-primary bg-primary/10"
            : "border-border bg-background hover:border-primary/70"
        }`}
      >
        <span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {customerStepKind(node)}
        </span>
        <span className="mt-2 block font-medium">{node.title || friendlyBlockName(node.type)}</span>
        <span
          title={stepPrimaryText(node) || visualBlockSummary(node)}
          className="mt-2 block max-h-16 overflow-hidden whitespace-pre-wrap text-muted-foreground"
        >
          {stepPrimaryText(node) || visualBlockSummary(node)}
        </span>
      </button>
      {branchRoutes.length ? (
        <div className="mt-3 space-y-2 border-l border-border pl-3">
          {branchRoutes.map((route) => (
            <OptionBranchCard
              key={route.key}
              route={route}
              onOpen={() => onOpenOption(route.key)}
              onAddTarget={() => onAddOptionTarget(route.key, route.label)}
            />
          ))}
        </div>
      ) : null}
      {node.type === "START" || node.type === "MAIN_MENU" || node.config.messageBehavior === "options" ? (
        <button
          type="button"
          disabled={!canAddOptionBranch}
          onClick={onAddOption}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/60 px-3 py-2 text-sm text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-lg leading-none">+</span>
          {canAddOptionBranch ? "Add WhatsApp option" : "Maximum 3 options"}
        </button>
      ) : null}
    </div>
  );
}

type ConversationOptionRoute = {
  key: string;
  label: string;
  target?: VisualFlowNode;
};

function OptionBranchCard({
  route,
  onOpen,
  onAddTarget,
}: {
  route: ConversationOptionRoute;
  onOpen: () => void;
  onAddTarget: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-surface/30 p-2 text-xs">
      {route.target ? (
        <button
          type="button"
          onClick={onOpen}
          className="block w-full rounded-md px-2 py-1.5 text-left transition hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="block text-muted-foreground">Option</span>
          <span className="mt-0.5 block font-medium">{route.label}</span>
          <span className="mt-1 block text-muted-foreground">
            Opens {route.target.title || friendlyBlockName(route.target.type)}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onAddTarget}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/60 px-3 py-2 text-primary transition hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="text-lg leading-none">+</span>
          Add target block
        </button>
      )}
    </div>
  );
}

function FocusedBranchCanvas({
  visualFlow,
  edges,
  selectedBlockId,
  focusedOption,
  onBack,
  onSelectBlock,
  onOpenOption,
  onAddAfterNode,
  onAddOption,
  onAddOptionTarget,
  onCreateOptionTarget,
  onUpdateOption,
  onDeleteOption,
  onChange,
  businessId,
}: {
  visualFlow: VisualFlowDefinition;
  edges: ReturnType<typeof getEffectiveVisualEdges>;
  selectedBlockId: string;
  businessId?: string;
  focusedOption: { sourceNodeId: string; optionKey: string };
  onBack: () => void;
  onSelectBlock: (blockId: string) => void;
  onOpenOption: (sourceNodeId: string, optionKey: string) => void;
  onAddAfterNode: (sourceNodeId: string, nextNodeId?: string) => void;
  onAddOption: (sourceNodeId: string) => void;
  onAddOptionTarget: (sourceNodeId: string, optionKey: string, optionLabel: string) => void;
  onCreateOptionTarget: (flow: VisualFlowDefinition, createdNodeId: string) => void;
  onUpdateOption: (
    sourceNodeId: string,
    optionKey: string,
    updater: (option: VisualMenuOption) => VisualMenuOption,
  ) => void;
  onDeleteOption: (sourceNodeId: string, optionKey: string) => void;
  onChange: (flow: VisualFlowDefinition) => void;
}) {
  const sourceNode = visualFlow.nodes.find((node) => node.id === focusedOption.sourceNodeId);
  const sourceOptionIndex =
    sourceNode?.config.menuOptions?.findIndex((option) => option.key === focusedOption.optionKey) ??
    -1;
  const sourceOption =
    sourceOptionIndex >= 0 ? sourceNode?.config.menuOptions?.[sourceOptionIndex] : undefined;
  const route = sourceNode
    ? optionRoutesForNode(
        sourceNode,
        visualFlow.nodes,
        edges.filter((edge) => edge.sourceNodeId === sourceNode.id),
      ).find((entry) => entry.key === focusedOption.optionKey)
    : undefined;
  const branchPath = route?.target
    ? [
        route.target,
        ...nextConversationPath(
          route.target,
          visualFlow.nodes,
          edges,
          new Set([route.target.id]),
          40,
        ),
      ]
    : [];
  const branchTitle = sourceOption?.label.en || route?.label || "Branch";
  const sourceTitle =
    sourceNode?.title || (sourceNode ? friendlyBlockName(sourceNode.type) : "option block");
  const [createTargetOpen, setCreateTargetOpen] = useState(false);

  return (
    <div className="rounded-md border border-border bg-surface/20 p-4 pb-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Back to main canvas
          </button>
          <div className="mt-2 font-medium">Branch: {branchTitle}</div>
          <div className="mt-1 text-sm text-muted-foreground">From {sourceTitle}</div>
        </div>
      </div>

      {sourceOption ? (
        <div className="mb-4 max-w-3xl rounded-md border border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-medium">This WhatsApp option</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Edit the button/list text customers see before this branch opens.
              </p>
            </div>
            <button
              type="button"
              className="studio-button-secondary border-destructive/50 px-3 py-1.5 text-destructive hover:bg-destructive/10"
              onClick={() => onDeleteOption(focusedOption.sourceNodeId, focusedOption.optionKey)}
            >
              Delete option
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <TextField
              label="WhatsApp button text EN"
              value={sourceOption.label.en}
              onChange={(value) =>
                onUpdateOption(focusedOption.sourceNodeId, focusedOption.optionKey, (option) => ({
                  ...option,
                  label: { ...option.label, en: value },
                }))
              }
            />
            <TextField
              label="WhatsApp button text AR"
              value={sourceOption.label.ar}
              dir="rtl"
              onChange={(value) =>
                onUpdateOption(focusedOption.sourceNodeId, focusedOption.optionKey, (option) => ({
                  ...option,
                  label: { ...option.label, ar: value },
                }))
              }
            />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            {sourceNode && sourceOption ? (
              <OptionResponseEditor
                visualFlow={visualFlow}
                sourceNode={sourceNode}
                option={sourceOption}
                optionIndex={sourceOptionIndex}
                nodes={visualFlow.nodes}
                businessId={businessId}
                onFlowChange={onChange}
              />
            ) : null}
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sourceOption.active !== false}
                disabled={
                  sourceOption.active === false &&
                  (sourceNode?.config.menuOptions ?? []).filter((option) => option.active !== false)
                    .length >= WHATSAPP_MAX_VISIBLE_OPTIONS
                }
                onChange={(event) =>
                  onUpdateOption(focusedOption.sourceNodeId, focusedOption.optionKey, (option) => ({
                    ...option,
                    active: event.target.checked,
                  }))
                }
              />
              Active
            </label>
          </div>
          {createTargetOpen ? (
            <CreateOptionTargetDialog
              visualFlow={visualFlow}
              sourceNodeId={focusedOption.sourceNodeId}
              optionKey={focusedOption.optionKey}
              suggestedTitle={branchTitle}
              onCancel={() => setCreateTargetOpen(false)}
              onCreate={(next, createdNodeId) => {
                setCreateTargetOpen(false);
                onCreateOptionTarget(next, createdNodeId);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {!route?.target ? (
        <div className="max-w-xl rounded-md border border-dashed border-primary/60 bg-background p-5 text-sm">
          <div className="font-medium">No target block yet</div>
          <p className="mt-1 text-muted-foreground">
            Create the first block that runs when this option is clicked.
          </p>
          <button
            type="button"
            className="studio-button-primary mt-4"
            onClick={() =>
              onAddOptionTarget(focusedOption.sourceNodeId, focusedOption.optionKey, branchTitle)
            }
          >
            Add target block
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-start gap-4">
            {branchPath.map((node, index) => (
              <div key={node.id} className="flex items-start gap-4">
                <ConversationMapBlock
                  node={node}
                  nodes={visualFlow.nodes}
                  edges={edges}
                  selectedBlockId={selectedBlockId}
                  selected={selectedBlockId === node.id}
                  onSelectBlock={onSelectBlock}
                  onAddOption={() => onAddOption(node.id)}
                  onAddOptionTarget={(optionKey, optionLabel) =>
                    onAddOptionTarget(node.id, optionKey, optionLabel)
                  }
                  onOpenOption={(optionKey) => onOpenOption(node.id, optionKey)}
                />
                <div className="flex min-h-[140px] flex-col items-center justify-center gap-2">
                  <button
                    type="button"
                    title={
                      index === branchPath.length - 1
                        ? "Add the next step after this block"
                        : "Insert a step between these blocks"
                    }
                    aria-label={
                      index === branchPath.length - 1
                        ? "Add the next step after this block"
                        : "Insert a step between these blocks"
                    }
                    onClick={() => onAddAfterNode(node.id, branchPath[index + 1]?.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="text-base leading-none">+</span>
                    {index === branchPath.length - 1 ? "Add next step" : "Insert step"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateOptionTargetDialog({
  visualFlow,
  sourceNodeId,
  optionKey,
  suggestedTitle,
  onCreate,
  onCancel,
}: {
  visualFlow: VisualFlowDefinition;
  sourceNodeId: string;
  optionKey: string;
  suggestedTitle: string;
  onCreate: (flow: VisualFlowDefinition, createdNodeId: string) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<AddStepKind>("message");
  const [title, setTitle] = useState(suggestedTitle);
  const selectedKind = addStepKinds.find((entry) => entry.id === kind) ?? addStepKinds[0];
  const availableKinds = addStepKinds.filter((entry) => entry.id !== "start");

  function createAndConnect() {
    const cleanTitle = title.trim() || selectedKind.label;
    const withNode = addConfiguredVisualNode(visualFlow, selectedKind.type, {
      title: cleanTitle,
      nextNodeId: kind === "image_return" ? sourceNodeId : undefined,
    });
    const created = withNode.nodes[withNode.nodes.length - 1];
    const createdConfig: VisualFlowNode["config"] =
      kind === "options"
        ? {
            ...created.config,
            messageBehavior: "options",
            menuOptions: [
              {
                key: "option_1",
                label: { en: "First option", ar: "" },
                active: true,
              },
            ],
          }
        : kind === "image_return"
          ? {
              ...created.config,
              mediaCaption: {
                en: cleanTitle,
                ar: "",
              },
              messageBehavior: "next",
              messageNextNodeId: sourceNodeId,
            }
        : selectedKind.type === "SEND_MESSAGE"
          ? {
              ...created.config,
              messageBehavior: kind === "message_end" ? "end" : created.config.messageBehavior,
            }
          : created.config;
    const nextFlow: VisualFlowDefinition = {
      ...withNode,
      nodes: withNode.nodes.map((node) => {
        if (node.id === created.id) return { ...node, config: createdConfig };
        if (node.id !== sourceNodeId) return node;
        return connectSourceNodeToCreatedStep(node, created.id, {
          mode: "option",
          optionKey,
          optionLabel: cleanTitle,
        });
      }),
    };
    onCreate(nextFlow, created.id);
  }

  return (
    <div className="mt-3 rounded-md border border-primary/40 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium">Create and connect a new block</div>
          <p className="mt-1 text-sm text-muted-foreground">
            This block will become the target after the customer taps this WhatsApp option.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Block type</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as AddStepKind)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            {availableKinds.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Admin title" value={title} onChange={setTitle} />
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" className="studio-button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="studio-button-primary" onClick={createAndConnect}>
          Create and connect
        </button>
      </div>
    </div>
  );
}

function MiniConversationBlock({
  node,
  selected,
  onSelectBlock,
}: {
  node: VisualFlowNode;
  selected: boolean;
  onSelectBlock: (blockId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelectBlock(node.id)}
      className={`w-[170px] rounded-md border px-3 py-2 text-left text-xs transition ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:border-primary/70"
      }`}
    >
      <span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {customerStepKind(node)}
      </span>
      <span className="mt-1 block font-medium">{node.title || friendlyBlockName(node.type)}</span>
      <span
        title={stepPrimaryText(node) || visualBlockSummary(node)}
        className="mt-1 block max-h-10 overflow-hidden whitespace-pre-wrap text-muted-foreground"
      >
        {stepPrimaryText(node) || visualBlockSummary(node)}
      </span>
    </button>
  );
}

function optionRoutesForNode(
  node: VisualFlowNode,
  nodes: VisualFlowNode[],
  outgoing: ReturnType<typeof getEffectiveVisualEdges>,
): ConversationOptionRoute[] {
  const byId = new Map(nodes.map((entry) => [entry.id, entry]));
  if (node.config.menuOptions?.length) {
    return node.config.menuOptions
      .filter((option) => option.active !== false)
      .map((option, index) => ({
        key: option.key || `option_${index + 1}`,
        label: option.label.en || option.key || `Option ${index + 1}`,
        target: option.targetNodeId ? byId.get(option.targetNodeId) : undefined,
      }));
  }

  return outgoing
    .filter((edge) => edge !== primaryNextEdge(node.id, outgoing))
    .map((edge) => ({
      key: edge.condition ?? edge.id,
      label: humanRouteLabel(edge.condition ?? edge.label) || "Option",
      target: byId.get(edge.targetNodeId),
    }));
}

function nextConversationPath(
  startNode: VisualFlowNode,
  nodes: VisualFlowNode[],
  edges: ReturnType<typeof getEffectiveVisualEdges>,
  visited: Set<string>,
  limit: number,
) {
  const path: VisualFlowNode[] = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let current = startNode;

  while (path.length < limit) {
    const edge = primaryNextEdge(current.id, edges);
    const next = edge ? byId.get(edge.targetNodeId) : undefined;
    if (!next || visited.has(next.id)) break;
    path.push(next);
    visited.add(next.id);
    current = next;
  }

  return path;
}

function InlineAddStepCard({
  visualFlow,
  sourceNodeId,
  mode,
  optionKey,
  optionLabel,
  nextNodeId,
  onCreate,
  onCancel,
}: {
  visualFlow: VisualFlowDefinition;
  sourceNodeId: string;
  mode: "next" | "option";
  optionKey?: string;
  optionLabel?: string;
  nextNodeId?: string;
  onCreate: (flow: VisualFlowDefinition, createdNodeId: string) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<AddStepKind>("message");
  const selectedKind = addStepKinds.find((entry) => entry.id === kind) ?? addStepKinds[0];
  const sourceNode = visualFlow.nodes.find((node) => node.id === sourceNodeId);

  function createStep() {
    const next = createInlineVisualStep(visualFlow, {
      sourceNodeId,
      mode,
      optionKey,
      type: selectedKind.type,
      title: selectedKind.label,
      optionLabel: optionLabel || selectedKind.label,
      makeOptions: kind === "options",
      endAfter: kind === "message_end",
      nextNodeId,
    });
    const created = next.nodes[next.nodes.length - 1];
    onCreate(next, created.id);
  }

  return (
    <div className="mt-4 max-w-xl rounded-md border border-primary/40 bg-background p-4 shadow-lg">
      <div className="font-medium">
        {mode === "option" && optionKey
          ? "Add what happens after this option"
          : mode === "option"
            ? "Add a branch option"
            : "Add the next block"}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {sourceNode
          ? `This will connect after ${sourceNode.title || friendlyBlockName(sourceNode.type)}.`
          : "This will connect to the selected place in the flow."}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as AddStepKind)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {addStepKinds.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
        <button type="button" className="studio-button-primary" onClick={createStep}>
          Create block
        </button>
        <button type="button" className="studio-button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function createInlineVisualStep(
  visualFlow: VisualFlowDefinition,
  options: {
    sourceNodeId: string;
    mode: "next" | "option";
    optionKey?: string;
    type: VisualFlowBlockType;
    title: string;
    optionLabel: string;
    makeOptions: boolean;
    endAfter: boolean;
    nextNodeId?: string;
  },
) {
  const withNode = addConfiguredVisualNode(visualFlow, options.type, {
    title: options.title,
    nextNodeId: options.nextNodeId,
  });
  const created = withNode.nodes[withNode.nodes.length - 1];
  const createdConfig: VisualFlowNode["config"] = {
    ...created.config,
    messageBehavior: options.makeOptions
      ? "options"
      : options.endAfter
        ? "end"
        : created.config.messageBehavior,
    menuOptions: options.makeOptions
      ? [
          {
            key: "option_1",
            label: { en: "First option", ar: "" },
            active: true,
          },
        ]
      : created.config.menuOptions,
  };

  return {
    ...withNode,
    nodes: withNode.nodes.map((node) => {
      if (node.id === created.id) return { ...node, config: createdConfig };
      if (node.id !== options.sourceNodeId) return node;
      return connectSourceNodeToCreatedStep(node, created.id, options);
    }),
  };
}

function connectSourceNodeToCreatedStep(
  source: VisualFlowNode,
  targetNodeId: string,
  options: { mode: "next" | "option"; optionKey?: string; optionLabel: string },
): VisualFlowNode {
  if (options.mode === "option") {
    if (options.optionKey) {
      return {
        ...source,
        config: {
          ...source.config,
          messageBehavior: source.type === "MAIN_MENU" ? source.config.messageBehavior : "options",
          menuOptions: (source.config.menuOptions ?? []).map((option) =>
            option.key === options.optionKey ? { ...option, targetNodeId } : option,
          ),
        },
      };
    }
    const optionKey = `option_${(source.config.menuOptions ?? []).length + 1}`;
    return {
      ...source,
      config: {
        ...source.config,
        messageBehavior: source.type === "MAIN_MENU" ? source.config.messageBehavior : "options",
        menuOptions: [
          ...(source.config.menuOptions ?? []),
          {
            key: optionKey,
            label: { en: options.optionLabel, ar: "" },
            targetNodeId,
            active: true,
          },
        ],
      },
    };
  }

  if (source.type === "START") {
    return {
      ...source,
      config: {
        ...source.config,
        startBehavior: "custom_step",
        messageNextNodeId: targetNodeId,
      },
    };
  }

  if (source.type === "QUESTION") {
    return {
      ...source,
      config: { ...source.config, questionNextNodeId: targetNodeId },
    };
  }

  if (source.type === "CONDITION") {
    return {
      ...source,
      config: { ...source.config, conditionFallbackNodeId: targetNodeId },
    };
  }

  return {
    ...source,
    config: {
      ...source.config,
      messageBehavior: "next",
      messageNextNodeId: targetNodeId,
    },
  };
}

function primaryNextEdge(sourceNodeId: string, edges: ReturnType<typeof getEffectiveVisualEdges>) {
  const outgoing = edges
    .filter((edge) => edge.sourceNodeId === sourceNodeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    outgoing.find(
      (edge) => !edge.condition || edge.condition === "next" || edge.condition === "answer",
    ) ?? (outgoing.length === 1 ? outgoing[0] : undefined)
  );
}

function customerStepKind(node: VisualFlowNode) {
  if (node.type === "START") return "Start";
  if (node.type === "MAIN_MENU" || node.config.messageBehavior === "options") return "Options";
  if (node.type === "QUESTION") return "Question";
  if (node.type === "HUMAN_HANDOFF") return "Human handoff";
  if (node.type === "END") return "End";
  return "Message";
}

function JourneySectionGrid({
  visualFlow,
  selectedBlockId,
  onSelectBlock,
}: {
  visualFlow: VisualFlowDefinition;
  selectedBlockId: string;
  onSelectBlock: (blockId: string) => void;
}) {
  const visibleNodes = visualFlow.nodes.filter((node) => !isLegacyCommerceInternalNode(node));
  const sections = [
    { title: "Start", types: ["START", "LANGUAGE_SELECTION", "MAIN_MENU"] },
    { title: "Browse", types: ["CATEGORY_SELECTION", "PRODUCT_SELECTION", "PRODUCT_DETAILS"] },
    { title: "Cart", types: ["CART_REVIEW"] },
    {
      title: "Checkout",
      types: [
        "CHECKOUT_CUSTOMER_NAME",
        "CHECKOUT_FULFILLMENT",
        "CHECKOUT_DELIVERY_DETAILS",
        "CHECKOUT_PAYMENT_METHOD",
        "CHECKOUT_NOTES",
        "ORDER_REVIEW",
        "ORDER_CONFIRMATION",
      ],
    },
    { title: "Support", types: ["STORE_INFO", "QUESTION", "HUMAN_HANDOFF"] },
  ];
  return (
    <div className="mt-4 grid gap-3 2xl:grid-cols-2">
      {sections.map((section) => {
        const nodes = visibleNodes.filter((node) => section.types.includes(node.type));
        return (
          <div key={section.title} className="rounded-md border border-border p-3">
            <div className="text-sm font-medium">{section.title}</div>
            <div className="mt-3 space-y-2">
              {nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectBlock(node.id)}
                  className={`block w-full rounded-md border p-3 text-left text-sm transition ${
                    selectedBlockId === node.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/70"
                  }`}
                >
                  <span className="block font-medium">
                    {node.title || friendlyBlockName(node.type)}
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    {visualBlockSummary(node)}
                  </span>
                  {stepPrimaryText(node) ? (
                    <span className="mt-2 block line-clamp-2 text-xs text-muted-foreground">
                      {stepPrimaryText(node)}
                    </span>
                  ) : null}
                </button>
              ))}
              {!nodes.length ? (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No step in this section.
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepSettingsColumn({
  visualFlow,
  selectedBlock,
  validation,
  businessId,
  botFlowSettings,
  catalogGroups,
  catalogGroupValues,
  checkoutSaving,
  orderConfirmationEnglish,
  orderConfirmationArabic,
  onUpdateNode,
  onChange,
  onSelectBlock,
  onBotFlowSettingsChange,
  onOrderConfirmationEnglishChange,
  onOrderConfirmationArabicChange,
  onSaveCheckoutSettings,
}: {
  visualFlow: VisualFlowDefinition;
  selectedBlock?: VisualFlowNode;
  validation?: ReturnType<typeof validateVisualFlow>;
  businessId?: string;
  botFlowSettings?: BusinessBotFlowSettings;
  catalogGroups: WaCatalogGroupRow[];
  catalogGroupValues: WaCatalogGroupValueRow[];
  checkoutSaving?: boolean;
  orderConfirmationEnglish?: string;
  orderConfirmationArabic?: string;
  onUpdateNode: (node: VisualFlowNode) => void;
  onChange: (flow: VisualFlowDefinition) => void;
  onSelectBlock: (blockId: string) => void;
  onBotFlowSettingsChange?: (settings: BusinessBotFlowSettings) => void;
  onOrderConfirmationEnglishChange?: (value: string) => void;
  onOrderConfirmationArabicChange?: (value: string) => void;
  onSaveCheckoutSettings?: () => void;
}) {
  const selectedIssues = selectedBlock ? issuesForStep(validation, selectedBlock) : [];
  const showCheckoutRuntimeSettings = Boolean(
    selectedBlock && isCheckoutRuntimeBlock(selectedBlock),
  );
  return (
    <div className="min-h-0 min-w-0 overflow-y-auto rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">Selected step</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit the visible copy, routing, and protected settings for this block.
          </p>
        </div>
        {selectedIssues.length ? (
          <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
            {selectedIssues.length} issue{selectedIssues.length === 1 ? "" : "s"}
          </span>
        ) : selectedBlock ? (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary">
            OK
          </span>
        ) : null}
      </div>
      {selectedBlock ? (
        <div className="mt-3 space-y-3">
          <SettingsSection title="Step identity">
            <StepExplanation block={selectedBlock} />
            <TextField
              label="Admin title"
              value={selectedBlock.title}
              onChange={(value) => onUpdateNode({ ...selectedBlock, title: value })}
            />
          </SettingsSection>
          {showCheckoutRuntimeSettings ? (
            <CheckoutRuntimeSettings
              selectedBlock={selectedBlock}
              settings={botFlowSettings}
              saving={checkoutSaving}
              orderConfirmationEnglish={orderConfirmationEnglish ?? ""}
              orderConfirmationArabic={orderConfirmationArabic ?? ""}
              onSettingsChange={onBotFlowSettingsChange}
              onOrderConfirmationEnglishChange={onOrderConfirmationEnglishChange}
              onOrderConfirmationArabicChange={onOrderConfirmationArabicChange}
              onSave={onSaveCheckoutSettings}
            />
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium">Customer-facing behavior</div>
              <BusinessBlockSettings
                block={selectedBlock}
                nodes={visualFlow.nodes}
                visualFlow={visualFlow}
                businessId={businessId}
                catalogGroups={catalogGroups}
                catalogGroupValues={catalogGroupValues}
                onChange={onUpdateNode}
                onFlowChange={onChange}
              />
            </div>
          )}
          {selectedIssues.length ? (
            <StepIssueList issues={selectedIssues} visualFlow={visualFlow} onSelectBlock={onSelectBlock} />
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Select a step to edit.</p>
      )}
    </div>
  );
}

function CheckoutRuntimeSettings({
  selectedBlock,
  settings,
  saving,
  orderConfirmationEnglish,
  orderConfirmationArabic,
  onSettingsChange,
  onOrderConfirmationEnglishChange,
  onOrderConfirmationArabicChange,
  onSave,
}: {
  selectedBlock: VisualFlowNode;
  settings?: BusinessBotFlowSettings;
  saving?: boolean;
  orderConfirmationEnglish: string;
  orderConfirmationArabic: string;
  onSettingsChange?: (settings: BusinessBotFlowSettings) => void;
  onOrderConfirmationEnglishChange?: (value: string) => void;
  onOrderConfirmationArabicChange?: (value: string) => void;
  onSave?: () => void;
}) {
  if (!settings || !onSettingsChange) {
    return (
      <div className="rounded-md border border-border bg-surface/40 p-3 text-sm text-muted-foreground">
        Runtime checkout settings are still loading. Refresh if this message stays visible.
      </div>
    );
  }

  const update = (patch: Partial<BusinessBotFlowSettings>) =>
    onSettingsChange({ ...settings, ...patch });
  const selectedPrompt = checkoutPromptForBlock(selectedBlock, settings, orderConfirmationEnglish);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
        <div className="font-medium text-amber-100">Runtime checkout block</div>
        <p className="mt-1 text-muted-foreground">
          This step is controlled by the protected checkout engine. Edit the real prompts and
          behavior below; generic message fields are hidden because they do not drive this part of
          the live bot.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Current visible prompt: {selectedPrompt || "This block may auto-continue depending on the settings."}
        </p>
      </div>

      <SettingsSection title="Entry and product behavior">
        <ToggleField
          label="Ask language first"
          checked={settings.languageSelectionEnabled}
          onChange={(value) => update({ languageSelectionEnabled: value })}
        />
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Default language</span>
          <select
            value={settings.defaultLanguage}
            onChange={(event) =>
              update({ defaultLanguage: event.target.value === "ar" ? "ar" : "en" })
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </label>
        <ToggleField
          label="Show product details before ordering"
          checked={settings.showProductDetailsBeforeOrdering}
          onChange={(value) => update({ showProductDetailsBeforeOrdering: value })}
        />
      </SettingsSection>

      <SettingsSection title="Checkout behavior">
        <ToggleField
          label="Auto-use saved customer checkout details"
          checked={settings.autoUseSavedCheckoutDetails}
          onChange={(value) => update({ autoUseSavedCheckoutDetails: value })}
        />
        <ToggleField
          label="Skip fulfillment if only delivery or pickup is available"
          checked={settings.skipFulfillmentWhenSingleOption}
          onChange={(value) => update({ skipFulfillmentWhenSingleOption: value })}
        />
        <ToggleField
          label="Skip delivery area if only one area exists"
          checked={settings.skipDeliveryAreaWhenSingleOption}
          onChange={(value) => update({ skipDeliveryAreaWhenSingleOption: value })}
        />
        <ToggleField
          label="Skip pickup location if only one place exists"
          checked={settings.skipPickupLocationWhenSingleOption}
          onChange={(value) => update({ skipPickupLocationWhenSingleOption: value })}
        />
        <ToggleField
          label="Skip payment if only one payment method exists"
          checked={settings.skipPaymentWhenSingleOption}
          onChange={(value) => update({ skipPaymentWhenSingleOption: value })}
        />
        <ToggleField
          label="Ask for order notes"
          checked={settings.orderNotesEnabled}
          onChange={(value) => update({ orderNotesEnabled: value })}
        />
      </SettingsSection>

      <SettingsSection title="Checkout prompt text">
        <CheckoutPromptFields
          englishLabel="Customer name prompt EN"
          arabicLabel="Customer name prompt AR"
          english={settings.customerNamePromptEnglish}
          arabic={settings.customerNamePromptArabic}
          onEnglish={(value) => update({ customerNamePromptEnglish: value })}
          onArabic={(value) => update({ customerNamePromptArabic: value })}
        />
        <CheckoutPromptFields
          englishLabel="Fulfillment prompt EN"
          arabicLabel="Fulfillment prompt AR"
          english={settings.fulfillmentPromptEnglish}
          arabic={settings.fulfillmentPromptArabic}
          onEnglish={(value) => update({ fulfillmentPromptEnglish: value })}
          onArabic={(value) => update({ fulfillmentPromptArabic: value })}
        />
        <CheckoutPromptFields
          englishLabel="Delivery area prompt EN"
          arabicLabel="Delivery area prompt AR"
          english={settings.deliveryAreaPromptEnglish}
          arabic={settings.deliveryAreaPromptArabic}
          onEnglish={(value) => update({ deliveryAreaPromptEnglish: value })}
          onArabic={(value) => update({ deliveryAreaPromptArabic: value })}
        />
        <CheckoutPromptFields
          englishLabel="Pickup location prompt EN"
          arabicLabel="Pickup location prompt AR"
          english={settings.pickupLocationPromptEnglish}
          arabic={settings.pickupLocationPromptArabic}
          onEnglish={(value) => update({ pickupLocationPromptEnglish: value })}
          onArabic={(value) => update({ pickupLocationPromptArabic: value })}
        />
        <CheckoutPromptFields
          englishLabel="Delivery address prompt EN"
          arabicLabel="Delivery address prompt AR"
          english={settings.deliveryAddressPromptEnglish}
          arabic={settings.deliveryAddressPromptArabic}
          onEnglish={(value) => update({ deliveryAddressPromptEnglish: value })}
          onArabic={(value) => update({ deliveryAddressPromptArabic: value })}
        />
        <CheckoutPromptFields
          englishLabel="Payment method prompt EN"
          arabicLabel="Payment method prompt AR"
          english={settings.paymentMethodPromptEnglish}
          arabic={settings.paymentMethodPromptArabic}
          onEnglish={(value) => update({ paymentMethodPromptEnglish: value })}
          onArabic={(value) => update({ paymentMethodPromptArabic: value })}
        />
        <CheckoutPromptFields
          englishLabel="Order notes prompt EN"
          arabicLabel="Order notes prompt AR"
          english={settings.orderNotesPromptEnglish}
          arabic={settings.orderNotesPromptArabic}
          onEnglish={(value) => update({ orderNotesPromptEnglish: value })}
          onArabic={(value) => update({ orderNotesPromptArabic: value })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="No-notes button EN"
            value={settings.noNotesButtonEnglish}
            onChange={(value) => update({ noNotesButtonEnglish: value })}
          />
          <TextField
            label="No-notes button AR"
            value={settings.noNotesButtonArabic}
            dir="rtl"
            onChange={(value) => update({ noNotesButtonArabic: value })}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Order confirmation">
        <CheckoutPromptFields
          englishLabel="Confirmation message EN"
          arabicLabel="Confirmation message AR"
          english={orderConfirmationEnglish}
          arabic={orderConfirmationArabic}
          onEnglish={(value) => onOrderConfirmationEnglishChange?.(value)}
          onArabic={(value) => onOrderConfirmationArabicChange?.(value)}
        />
      </SettingsSection>

      <button
        type="button"
        disabled={saving || !onSave}
        className="studio-button-primary w-full justify-center disabled:cursor-wait disabled:opacity-60"
        onClick={onSave}
      >
        {saving ? "Saving checkout settings..." : "Save checkout settings"}
      </button>
    </div>
  );
}

function CheckoutPromptFields({
  englishLabel,
  arabicLabel,
  english,
  arabic,
  onEnglish,
  onArabic,
}: {
  englishLabel: string;
  arabicLabel: string;
  english: string;
  arabic: string;
  onEnglish: (value: string) => void;
  onArabic: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <TextAreaField label={englishLabel} value={english} onChange={onEnglish} />
      <TextAreaField label={arabicLabel} value={arabic} dir="rtl" onChange={onArabic} />
    </div>
  );
}

function TestFlowMode({
  visualFlow,
  selectedBlockId,
  validation,
}: {
  visualFlow: VisualFlowDefinition;
  selectedBlockId: string;
  validation?: ReturnType<typeof validateVisualFlow>;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-h-0 overflow-y-auto rounded-md border border-border bg-background p-4">
        <div className="font-medium">Test conversation path</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview the conversation from the start or from the selected step before publishing.
        </p>
        <div className="mt-4">
          <StepRunPreview visualFlow={visualFlow} selectedBlockId={selectedBlockId} />
        </div>
      </div>
      <div className="min-h-0 overflow-y-auto rounded-md border border-border bg-background p-4">
        <div className="font-medium">Validation</div>
        <div
          className={validation?.ok ? "mt-2 text-sm text-primary" : "mt-2 text-sm text-destructive"}
        >
          {validation?.ok ? "Ready to publish" : "Fix these before publishing"}
        </div>
        <div className="mt-4 space-y-2">
          {validation?.issues.length ? (
            validation.issues.map((issue, index) => (
              <div
                key={`${issue.code}-${index}`}
                className="rounded-md border border-border p-3 text-sm"
              >
                <span
                  className={issue.severity === "ERROR" ? "text-destructive" : "text-amber-200"}
                >
                  {issue.severity}
                </span>{" "}
                {humanizeValidationIssue(issue.message)}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No validation issues.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AdvancedVisualFlowMode({
  graphTools,
  visualFlow,
  validation,
}: {
  graphTools: React.ReactNode;
  visualFlow: VisualFlowDefinition;
  validation?: ReturnType<typeof validateVisualFlow>;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-h-0 overflow-hidden">{graphTools}</div>
      <div className="min-h-0 overflow-hidden rounded-md border border-border bg-background p-4">
        <div className="font-medium">Advanced JSON - for developers only</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Editing JSON directly can break the flow. Use the visual editor unless you know what you
          are doing.
        </p>
        <textarea
          readOnly
          value={JSON.stringify(visualFlow, null, 2)}
          className="mt-3 h-[calc(100vh-260px)] w-full resize-none rounded-md border border-input bg-background p-3 font-mono text-xs"
        />
      </div>
      <div className="min-h-0 overflow-y-auto rounded-md border border-border bg-background p-4 xl:col-start-2">
        <div className="font-medium">Inspector</div>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <div>Steps: {visualFlow.nodes.length}</div>
          <div>Connections: {getEffectiveVisualEdges(visualFlow).length}</div>
          <div>Status: {validation?.ok ? "Valid" : "Needs fixes"}</div>
        </div>
      </div>
    </div>
  );
}

type AddStepKind =
  | "start"
  | "message"
  | "message_end"
  | "image_return"
  | "options"
  | "question"
  | "products"
  | "cart"
  | "checkout"
  | "condition"
  | "handoff"
  | "end";

const addStepKinds: Array<{ id: AddStepKind; label: string; type: VisualFlowBlockType }> = [
  { id: "start", label: "Start", type: "START" },
  { id: "message", label: "Send a message", type: "SEND_MESSAGE" },
  { id: "message_end", label: "Send one message then stop", type: "SEND_MESSAGE" },
  { id: "image_return", label: "Send image then return here", type: "SEND_IMAGE" },
  { id: "options", label: "Send a message with options", type: "SEND_MESSAGE" },
  { id: "question", label: "Ask a question", type: "QUESTION" },
  { id: "products", label: "Product purchase", type: "PRODUCT_SELECTION" },
  { id: "cart", label: "Show cart", type: "CART_REVIEW" },
  { id: "checkout", label: "Start checkout", type: "CHECKOUT_FULFILLMENT" },
  { id: "condition", label: "Add condition", type: "CONDITION" },
  { id: "handoff", label: "Talk to human", type: "HUMAN_HANDOFF" },
  { id: "end", label: "End conversation", type: "END" },
];

function AddStepWizard({
  visualFlow,
  onCreate,
  onCancel,
}: {
  visualFlow: VisualFlowDefinition;
  onCreate: (flow: VisualFlowDefinition) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<AddStepKind>("message");
  const [title, setTitle] = useState("");
  const [afterNodeId, setAfterNodeId] = useState("");
  const [nextNodeId, setNextNodeId] = useState("");
  const selectedKind = addStepKinds.find((entry) => entry.id === kind) ?? addStepKinds[0];

  return (
    <div className="mt-3 space-y-3 rounded-md border border-primary/40 bg-primary/5 p-3">
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Step type</span>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as AddStepKind)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          {addStepKinds.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      <TextField label="Step title" value={title} onChange={setTitle} />
      <NextBlockSelect
        label="Place after"
        nodes={visualFlow.nodes}
        value={afterNodeId}
        onChange={setAfterNodeId}
      />
      <NextBlockSelect
        label="Then go to"
        nodes={visualFlow.nodes}
        value={nextNodeId}
        onChange={setNextNodeId}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="studio-button-primary"
          onClick={() => {
            const next = addConfiguredVisualNode(visualFlow, selectedKind.type, {
              title: title || selectedKind.label,
              afterNodeId,
              nextNodeId: kind === "message_end" ? undefined : nextNodeId,
            });
            const created = next.nodes[next.nodes.length - 1];
            onCreate({
              ...next,
              nodes: next.nodes.map((node) =>
                node.id === created.id && (kind === "options" || kind === "message_end")
                  ? {
                      ...node,
                      config: {
                        ...node.config,
                        messageBehavior: kind === "options" ? "options" : "end",
                        ...(kind === "message_end" ? { menuOptions: node.config.menuOptions } : {}),
                        menuOptions: [
                          {
                            key: "option_1",
                            label: { en: "First option", ar: "الخيار الأول" },
                            active: true,
                          },
                        ],
                        ...(kind === "message_end" ? { menuOptions: node.config.menuOptions } : {}),
                      },
                    }
                  : node,
              ),
            });
          }}
        >
          Create step
        </button>
        <button type="button" className="studio-button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function GuidedAddStepWizard({
  visualFlow,
  selectedBlockId,
  defaultKind = "message",
  onCreate,
  onCancel,
}: {
  visualFlow: VisualFlowDefinition;
  selectedBlockId: string;
  defaultKind?: AddStepKind;
  onCreate: (flow: VisualFlowDefinition, createdNodeId: string) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<AddStepKind>(defaultKind);
  const [title, setTitle] = useState("");
  const [placement, setPlacement] = useState<"after_selected" | "option_target" | "unconnected">(
    "after_selected",
  );
  const [afterBehavior, setAfterBehavior] = useState<"next" | "options" | "main_menu" | "end">(
    "next",
  );
  const [nextNodeId, setNextNodeId] = useState("");
  const selectedKind = addStepKinds.find((entry) => entry.id === kind) ?? addStepKinds[0];
  const selectedBlock = visualFlow.nodes.find((node) => node.id === selectedBlockId);

  function createStep() {
    const afterNodeId = placement === "after_selected" ? selectedBlockId : "";
    const withNode = addConfiguredVisualNode(visualFlow, selectedKind.type, {
      title: title.trim() || selectedKind.label,
      afterNodeId,
      nextNodeId:
        kind === "image_return"
          ? selectedBlockId
          : afterBehavior === "next"
            ? nextNodeId
            : undefined,
    });
    const created = withNode.nodes[withNode.nodes.length - 1];
    const createdConfig: VisualFlowNode["config"] =
      kind === "options" || (selectedKind.type !== "SEND_IMAGE" && afterBehavior === "options")
        ? {
            ...created.config,
            messageBehavior: "options",
            menuOptions: [
              {
                key: "option_1",
                label: { en: "First option", ar: "" },
                active: true,
              },
            ],
          }
        : selectedKind.type === "SEND_IMAGE"
          ? {
              ...created.config,
              mediaCaption: { en: title.trim() || selectedKind.label, ar: "" },
              messageBehavior: kind === "image_return" ? "next" : created.config.messageBehavior,
              messageNextNodeId:
                kind === "image_return" ? selectedBlockId : created.config.messageNextNodeId,
            }
          : {
            ...created.config,
            messageBehavior:
              selectedKind.type === "SEND_MESSAGE"
                ? kind === "message_end"
                  ? "end"
                  : afterBehavior === "main_menu"
                  ? "main_menu"
                  : afterBehavior === "end"
                    ? "end"
                    : created.config.messageBehavior
                : created.config.messageBehavior,
          };
    let nextFlow: VisualFlowDefinition = {
      ...withNode,
      nodes: withNode.nodes.map((node) =>
        node.id === created.id ? { ...node, config: createdConfig } : node,
      ),
    };

    if (placement === "option_target" && selectedBlock) {
      const optionKey = `option_${(selectedBlock.config.menuOptions ?? []).length + 1}`;
      nextFlow = {
        ...nextFlow,
        nodes: nextFlow.nodes.map((node) =>
          node.id === selectedBlock.id
            ? {
                ...node,
                config: {
                  ...node.config,
                  messageBehavior:
                    node.type === "MAIN_MENU" ? node.config.messageBehavior : "options",
                  menuOptions: [
                    ...(node.config.menuOptions ?? []),
                    {
                      key: optionKey,
                      label: { en: title.trim() || selectedKind.label, ar: "" },
                      targetNodeId: created.id,
                      active: true,
                    },
                  ],
                },
              }
            : node,
        ),
      };
    }

    onCreate(nextFlow, created.id);
  }

  return (
    <div className="mt-3 space-y-3 rounded-md border border-primary/40 bg-primary/5 p-3">
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Step type</span>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as AddStepKind)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          {addStepKinds.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      <TextField label="Step title" value={title} onChange={setTitle} />
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Where should this step be placed?</span>
        <select
          value={placement}
          onChange={(event) => setPlacement(event.target.value as typeof placement)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="after_selected">
            After selected step{selectedBlock ? ` (${selectedBlock.title})` : ""}
          </option>
          <option value="option_target">As a new option target from selected step</option>
          <option value="unconnected">Unconnected / custom</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">
          What should happen after this step?
        </span>
        <select
          value={afterBehavior}
          onChange={(event) => setAfterBehavior(event.target.value as typeof afterBehavior)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="next">Go to another step</option>
          <option value="options">Show options</option>
          <option value="main_menu">Go to main menu</option>
          <option value="end">End conversation here</option>
        </select>
      </label>
      {afterBehavior === "next" ? (
        <NextBlockSelect
          label="Then go to"
          nodes={visualFlow.nodes}
          value={nextNodeId}
          onChange={setNextNodeId}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="studio-button-primary" onClick={createStep}>
          Create step
        </button>
        <button type="button" className="studio-button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ConversationOutline({
  nodes,
  validation,
  selectedBlockId,
  onSelect,
}: {
  nodes: VisualFlowNode[];
  validation?: ReturnType<typeof validateVisualFlow>;
  selectedBlockId: string;
  onSelect: (nodeId: string) => void;
}) {
  const visibleNodes = nodes.filter((node) => !isLegacyCommerceInternalNode(node));
  const groups = [
    {
      title: "Entry",
      types: ["START", "LANGUAGE_SELECTION", "MAIN_MENU"],
    },
    {
      title: "Ordering",
      types: [
        "CATEGORY_SELECTION",
        "PRODUCT_SELECTION",
        "PRODUCT_DETAILS",
        "SEND_MESSAGE",
        "CART_REVIEW",
      ],
    },
    {
      title: "Checkout",
      types: [
        "CHECKOUT_CUSTOMER_NAME",
        "CHECKOUT_FULFILLMENT",
        "CHECKOUT_DELIVERY_DETAILS",
        "CHECKOUT_PAYMENT_METHOD",
        "CHECKOUT_NOTES",
        "ORDER_REVIEW",
        "ORDER_CONFIRMATION",
      ],
    },
    { title: "Support", types: ["QUESTION", "CONDITION", "HUMAN_HANDOFF"] },
    { title: "End states", types: ["GO_TO_MAIN_MENU", "END"] },
  ];
  const used = new Set<string>();
  return (
    <div className="mt-4 space-y-4">
      {groups.map((group) => {
        const groupNodes = visibleNodes.filter((node) => group.types.includes(node.type));
        groupNodes.forEach((node) => used.add(node.id));
        if (!groupNodes.length) return null;
        return (
          <div key={group.title}>
            <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {group.title}
            </div>
            <div className="space-y-1">
              {groupNodes.map((node) => (
                <OutlineStepButton
                  key={node.id}
                  node={node}
                  selected={selectedBlockId === node.id}
                  issues={issuesForStep(validation, node)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        );
      })}
      {visibleNodes.some((node) => !used.has(node.id)) ? (
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Other steps
          </div>
          <div className="space-y-1">
            {visibleNodes
              .filter((node) => !used.has(node.id))
              .map((node) => (
                <OutlineStepButton
                  key={node.id}
                  node={node}
                  selected={selectedBlockId === node.id}
                  issues={issuesForStep(validation, node)}
                  onSelect={onSelect}
                />
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OutlineStepButton({
  node,
  selected,
  issues,
  onSelect,
}: {
  node: VisualFlowNode;
  selected: boolean;
  issues: NonNullable<ReturnType<typeof validateVisualFlow>>["issues"];
  onSelect: (nodeId: string) => void;
}) {
  const hasError = issues.some((issue) => issue.severity === "ERROR");
  const hasWarning = issues.some((issue) => issue.severity === "WARNING");
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition hover:border-primary ${
        selected ? "border-primary bg-primary/10" : "border-border"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium">{node.title || friendlyBlockName(node.type)}</span>
        {hasError || hasWarning ? (
          <span
            className={
              hasError
                ? "rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive"
                : "rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-200"
            }
          >
            {hasError ? "Error" : "Warning"}
          </span>
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
        )}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">
        {friendlyBlockName(node.type)}
      </span>
      <span className="mt-1 block truncate text-[11px] text-muted-foreground/70">{node.id}</span>
      {visualBlockSummary(node) ? (
        <span className="mt-1 block text-xs text-muted-foreground">{visualBlockSummary(node)}</span>
      ) : null}
    </button>
  );
}

type VisualMenuOption = NonNullable<VisualFlowNode["config"]["menuOptions"]>[number];
type VisualConditionRule = NonNullable<VisualFlowNode["config"]["conditionRules"]>[number];

function BusinessBlockSettings({
  block,
  nodes,
  visualFlow,
  businessId,
  catalogGroups = [],
  catalogGroupValues = [],
  onChange,
  onFlowChange,
}: {
  block: VisualFlowNode;
  nodes: VisualFlowNode[];
  visualFlow: VisualFlowDefinition;
  businessId?: string;
  catalogGroups?: WaCatalogGroupRow[];
  catalogGroupValues?: WaCatalogGroupValueRow[];
  onChange: (node: VisualFlowNode) => void;
  onFlowChange: (flow: VisualFlowDefinition) => void;
}) {
  if (block.type === "START") {
    return (
      <EntryPointSettings
        block={block}
        nodes={nodes}
        visualFlow={visualFlow}
        businessId={businessId}
        onChange={onChange}
        onFlowChange={onFlowChange}
      />
    );
  }
  if (block.type === "MAIN_MENU") {
    return (
      <MainMenuBlockSettings
        block={block}
        nodes={nodes}
        visualFlow={visualFlow}
        businessId={businessId}
        onChange={onChange}
        onFlowChange={onFlowChange}
      />
    );
  }
  if (block.type === "QUESTION") {
    return <QuestionBlockSettings block={block} nodes={nodes} onChange={onChange} />;
  }
  if (block.type === "CONDITION") {
    return <ConditionBlockSettings block={block} nodes={nodes} onChange={onChange} />;
  }
  if (block.type === "HUMAN_HANDOFF") {
    return <HandoffBlockSettings block={block} onChange={onChange} />;
  }
  if (block.type === "CATEGORY_SELECTION") {
    return (
      <BrowseRoutesBlockSettings
        block={block}
        nodes={nodes}
        visualFlow={visualFlow}
        businessId={businessId}
        catalogGroups={catalogGroups}
        catalogGroupValues={catalogGroupValues}
        onChange={onChange}
        onFlowChange={onFlowChange}
      />
    );
  }
  if (block.type === "SEND_IMAGE") {
    return (
      <ImageStepSettings
        block={block}
        nodes={nodes}
        businessId={businessId}
        onChange={onChange}
      />
    );
  }
  if (block.config.menuOptions?.length || block.config.messageBehavior === "options") {
    return (
      <OptionsMessageSettings
        block={block}
        nodes={nodes}
        visualFlow={visualFlow}
        businessId={businessId}
        onChange={onChange}
        onFlowChange={onFlowChange}
      />
    );
  }
  if (block.type === "SEND_MESSAGE" || block.config.messageBehavior) {
    return <MessageStepSettings block={block} nodes={nodes} onChange={onChange} />;
  }
  const outgoing = getEffectiveVisualEdges(visualFlow).find(
    (edge) => edge.sourceNodeId === block.id,
  );
  const nextNode = nodes.find((node) => node.id === outgoing?.targetNodeId);
  return (
    <>
      <TextAreaField
        label="Message EN"
        value={block.config.messages?.en ?? ""}
        onChange={(value) =>
          onChange({
            ...block,
            config: { ...block.config, messages: { ...block.config.messages, en: value } },
          })
        }
      />
      <TextAreaField
        label="Message AR"
        value={block.config.messages?.ar ?? ""}
        dir="rtl"
        onChange={(value) =>
          onChange({
            ...block,
            config: { ...block.config, messages: { ...block.config.messages, ar: value } },
          })
        }
      />
      <NextBlockSelect
        label="Next block"
        nodes={nodes}
        value={outgoing?.targetNodeId ?? ""}
        onChange={(targetNodeId) =>
          onFlowChange(replaceSingleVisualConnection(visualFlow, block.id, targetNodeId))
        }
      />
      <NextStepHint node={nextNode} />
    </>
  );
}

function EntryPointSettings({
  block,
  nodes,
  visualFlow,
  businessId,
  onChange,
  onFlowChange,
}: {
  block: VisualFlowNode;
  nodes: VisualFlowNode[];
  visualFlow: VisualFlowDefinition;
  businessId?: string;
  onChange: (node: VisualFlowNode) => void;
  onFlowChange: (flow: VisualFlowDefinition) => void;
}) {
  const outgoing = getEffectiveVisualEdges(visualFlow).find(
    (edge) => edge.sourceNodeId === block.id,
  );
  const behavior = block.config.startBehavior ?? "welcome_then_next";
  return (
    <div className="space-y-4">
      <SettingsSection title="Entry point">
        <p className="text-sm text-muted-foreground">
          This controls what happens when a customer first messages the business.
        </p>
      </SettingsSection>
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">First step behavior</span>
        <select
          value={behavior}
          onChange={(event) =>
            onChange({
              ...block,
              config: {
                ...block.config,
                startBehavior: event.target.value as NonNullable<
                  VisualFlowNode["config"]["startBehavior"]
                >,
              },
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="language_first">Ask language first</option>
          <option value="welcome_then_next">Send welcome message first</option>
          <option value="main_menu">Go directly to main menu</option>
          <option value="custom_step">Start from a custom step</option>
        </select>
      </label>
      {behavior === "welcome_then_next" ? (
        <SettingsSection title="Welcome message">
          <TextAreaField
            label="Welcome message EN"
            value={block.config.messages?.en ?? ""}
            onChange={(value) =>
              onChange({
                ...block,
                config: { ...block.config, messages: { ...block.config.messages, en: value } },
              })
            }
          />
          <TextAreaField
            label="Welcome message AR"
            value={block.config.messages?.ar ?? ""}
            dir="rtl"
            onChange={(value) =>
              onChange({
                ...block,
                config: { ...block.config, messages: { ...block.config.messages, ar: value } },
              })
            }
          />
          <NextBlockSelect
            label="Next step"
            nodes={nodes}
            value={block.config.messageNextNodeId ?? outgoing?.targetNodeId ?? ""}
            onChange={(targetNodeId) =>
              onChange({
                ...block,
                config: {
                  ...block.config,
                  messageNextNodeId: targetNodeId,
                  startBehavior: "welcome_then_next",
                },
              })
            }
          />
        </SettingsSection>
      ) : null}
      {block.config.menuOptions?.length ? (
        <MenuOptionsEditor
          block={block}
          nodes={nodes}
          visualFlow={visualFlow}
          businessId={businessId}
          onChange={onChange}
          onFlowChange={onFlowChange}
          title="Welcome options customers see"
        />
      ) : null}
      {behavior === "custom_step" ? (
        <NextBlockSelect
          label="Target step"
          nodes={nodes}
          value={block.config.messageNextNodeId ?? outgoing?.targetNodeId ?? ""}
          onChange={(targetNodeId) => {
            const updatedBlock: VisualFlowNode = {
              ...block,
              config: {
                ...block.config,
                messageNextNodeId: targetNodeId,
                startBehavior: "custom_step",
              },
            };
            onFlowChange({
              ...visualFlow,
              nodes: visualFlow.nodes.map((node) =>
                node.id === updatedBlock.id ? updatedBlock : node,
              ),
              edges: [
                ...visualFlow.edges.filter((edge) => edge.sourceNodeId !== block.id),
                {
                  id: `${block.id}_entry_to_${targetNodeId}`,
                  sourceNodeId: block.id,
                  sourceHandle: "entry",
                  targetNodeId,
                  label: "First step",
                  condition: null,
                  sortOrder: visualFlow.edges.length + 1,
                },
              ],
            });
          }}
        />
      ) : null}
    </div>
  );
}

function BrowseRoutesBlockSettings({
  block,
  nodes,
  visualFlow,
  businessId,
  catalogGroups,
  catalogGroupValues,
  onChange,
  onFlowChange,
}: {
  block: VisualFlowNode;
  nodes: VisualFlowNode[];
  visualFlow: VisualFlowDefinition;
  businessId?: string;
  catalogGroups: WaCatalogGroupRow[];
  catalogGroupValues: WaCatalogGroupValueRow[];
  onChange: (node: VisualFlowNode) => void;
  onFlowChange: (flow: VisualFlowDefinition) => void;
}) {
  const routes = block.config.browseRoutes?.length
    ? block.config.browseRoutes
    : defaultBrowseRoutes();
  const outgoing = getEffectiveVisualEdges(visualFlow).find(
    (edge) => edge.sourceNodeId === block.id,
  );
  const updateRoutes = (nextRoutes: FlowBrowseRoute[]) =>
    onChange({ ...block, config: { ...block.config, browseRoutes: nextRoutes } });
  const updateRoute = (index: number, patch: Partial<FlowBrowseRoute>) =>
    updateRoutes(
      routes.map((route, routeIndex) => (routeIndex === index ? { ...route, ...patch } : route)),
    );

  return (
    <div className="space-y-4">
      <SettingsSection title="Browse routes customers see">
        <p className="text-xs text-muted-foreground">
          This is the first catalog step after a customer chooses to order. Add scalable routes like
          Categories, Brands, Offers, Occasions, or any catalog group the admin manages.
        </p>
        <div className="space-y-3">
          {routes.map((route, index) => {
            const routeSlug = normalizeClientSlug(route.groupSlug || route.key || route.label.en);
            const catalogGroup = catalogGroups.find((group) => group.slug === routeSlug);
            const values = catalogGroup
              ? catalogGroupValues
                  .filter((value) => value.group_id === catalogGroup.id)
                  .sort((a, b) => a.sort_order - b.sort_order)
              : [];
            return (
              <div
                key={`browse-route-${index}`}
                className="space-y-3 rounded-md border border-border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">
                      {route.label.en || `Route ${index + 1}`}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {route.source === "catalog_group"
                        ? catalogGroup
                          ? `${values.length} sub-option(s) available`
                          : "No matching saved route data for this slug."
                        : "Sub-options come from product Categories."}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="studio-button-secondary px-2 py-1"
                    onClick={() =>
                      updateRoutes(routes.filter((_, routeIndex) => routeIndex !== index))
                    }
                  >
                    Delete
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField
                    label="WhatsApp list label EN"
                    value={route.label.en}
                    onChange={(value) =>
                      updateRoute(index, { label: { ...route.label, en: value } })
                    }
                  />
                  <TextField
                    label="WhatsApp list label AR"
                    value={route.label.ar}
                    dir="rtl"
                    onChange={(value) =>
                      updateRoute(index, { label: { ...route.label, ar: value } })
                    }
                  />
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">Route source</span>
                  <select
                    value="catalog_group"
                    onChange={() =>
                      updateRoute(index, {
                        source: "catalog_group",
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="catalog_group">Catalog route</option>
                  </select>
                </label>
                <TextField
                  label="Catalog group slug"
                  value={routeSlug}
                  onChange={(value) => {
                    const nextSlug = normalizeClientSlug(value);
                    updateRoute(index, { key: nextSlug, groupSlug: nextSlug });
                  }}
                />
                <ToggleField
                  label="Active"
                  checked={route.active !== false}
                  onChange={(checked) => updateRoute(index, { active: checked })}
                />

                <div className="space-y-3 rounded-md border border-border bg-surface/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">Route data status</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          The flow only decides that this route appears. Route definitions, route
                          values, and product membership are managed on admin setup screens.
                        </div>
                      </div>
                      {businessId ? (
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`/admin/businesses/${businessId}/catalog-routes`}
                            className="studio-button-secondary px-2 py-1"
                          >
                            Routes
                          </a>
                          <a
                            href={`/admin/businesses/${businessId}/catalog-route-values`}
                            className="studio-button-secondary px-2 py-1"
                          >
                            Values
                          </a>
                          <a
                            href={`/admin/businesses/${businessId}/products`}
                            className="studio-button-secondary px-2 py-1"
                          >
                            Products
                          </a>
                        </div>
                      ) : null}
                    </div>

                    {catalogGroup ? (
                      <>
                        {values.length ? (
                          <div className="flex flex-wrap gap-2">
                            {values.map((value) => (
                              <span
                                key={value.id}
                                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                              >
                                {value.name_english}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No route values yet. WhatsApp will not show this route until the route
                            has active values with products assigned.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No admin route exists for slug <span className="font-mono">{routeSlug}</span>.
                        Create it in Catalog routes, then add route values and assign products.
                      </p>
                    )}
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="studio-button-secondary"
          onClick={() =>
            updateRoutes([
              ...routes,
              {
                key: `custom_route_${routes.length + 1}`,
                source: "catalog_group",
                groupSlug: "",
                label: { en: "New route", ar: "\u0645\u0633\u0627\u0631 \u062c\u062f\u064a\u062f" },
                active: true,
                sortOrder: routes.length + 1,
              },
            ])
          }
        >
          Add browse route
        </button>
      </SettingsSection>
      <NextBlockSelect
        label="After customer chooses a route value"
        nodes={nodes}
        value={outgoing?.targetNodeId ?? ""}
        onChange={(targetNodeId) =>
          onFlowChange(replaceSingleVisualConnection(visualFlow, block.id, targetNodeId))
        }
      />
    </div>
  );
}

function defaultBrowseRoutes(): FlowBrowseRoute[] {
  return [
    {
      key: "collections",
      source: "catalog_group",
      groupSlug: "collections",
      label: { en: "Collections", ar: "\u0645\u062c\u0645\u0648\u0639\u0627\u062a" },
      active: true,
      sortOrder: 1,
    },
  ];
}

function normalizeClientSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "route"
  );
}

function ImageStepSettings({
  block,
  nodes,
  businessId,
  onChange,
}: {
  block: VisualFlowNode;
  nodes: VisualFlowNode[];
  businessId?: string;
  onChange: (node: VisualFlowNode) => void;
}) {
  const behavior = block.config.messageBehavior ?? "next";
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!businessId) {
      setUploadError("Open a business before uploading images.");
      return;
    }

    setUploading(true);
    setUploadError("");
    try {
      const image = await uploadAdminFlowImage(businessId, file);
      onChange({ ...block, config: { ...block.config, mediaUrl: image.url } });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <SettingsSection title="Image customers receive">
        <div className="rounded-md border border-border bg-surface/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Upload image</div>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, or WebP. Maximum 3 MB. The uploaded public URL is saved into this step.
              </p>
            </div>
            <label
              className={`studio-button-secondary cursor-pointer ${
                uploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {uploading ? "Uploading..." : "Choose image"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  void handleUpload(file);
                }}
              />
            </label>
          </div>
          {uploadError ? <p className="mt-2 text-xs text-destructive">{uploadError}</p> : null}
          {block.config.mediaUrl ? (
            <div className="mt-3 overflow-hidden rounded-md border border-border bg-background">
              <img
                src={block.config.mediaUrl}
                alt="Uploaded WhatsApp image preview"
                className="max-h-48 w-full object-contain"
              />
            </div>
          ) : null}
        </div>
        <TextField
          label="Public image URL"
          value={block.config.mediaUrl ?? ""}
          onChange={(value) =>
            onChange({ ...block, config: { ...block.config, mediaUrl: value } })
          }
        />
        <p className="text-xs text-muted-foreground">
          Use a direct http or https image link. WhatsApp sends this as an image message, not a text
          link.
        </p>
        <TextAreaField
          label="Caption EN"
          value={block.config.mediaCaption?.en ?? ""}
          onChange={(value) =>
            onChange({
              ...block,
              config: {
                ...block.config,
                mediaCaption: { ...block.config.mediaCaption, en: value },
              },
            })
          }
        />
        <TextAreaField
          label="Caption AR"
          value={block.config.mediaCaption?.ar ?? ""}
          dir="rtl"
          onChange={(value) =>
            onChange({
              ...block,
              config: {
                ...block.config,
                mediaCaption: { ...block.config.mediaCaption, ar: value },
              },
            })
          }
        />
      </SettingsSection>
      <SettingsSection title="After image">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">After sending image</span>
          <select
            value={behavior}
            onChange={(event) =>
              onChange({
                ...block,
                config: {
                  ...block.config,
                  messageBehavior: event.target.value as NonNullable<
                    VisualFlowNode["config"]["messageBehavior"]
                  >,
                },
              })
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="next">Go to another step</option>
            <option value="end">End conversation</option>
            <option value="main_menu">Go to main menu</option>
          </select>
        </label>
        {behavior === "next" ? (
          <NextBlockSelect
            label="Target step"
            nodes={nodes}
            value={block.config.messageNextNodeId ?? ""}
            onChange={(value) =>
              onChange({ ...block, config: { ...block.config, messageNextNodeId: value } })
            }
          />
        ) : null}
      </SettingsSection>
    </div>
  );
}

function MessageStepSettings({
  block,
  nodes,
  onChange,
}: {
  block: VisualFlowNode;
  nodes: VisualFlowNode[];
  onChange: (node: VisualFlowNode) => void;
}) {
  const behavior = block.config.messageBehavior ?? "next";
  return (
    <div className="space-y-4">
      <TextAreaField
        label="Message EN"
        value={block.config.messages?.en ?? ""}
        onChange={(value) =>
          onChange({
            ...block,
            config: { ...block.config, messages: { ...block.config.messages, en: value } },
          })
        }
      />
      <TextAreaField
        label="Message AR"
        value={block.config.messages?.ar ?? ""}
        dir="rtl"
        onChange={(value) =>
          onChange({
            ...block,
            config: { ...block.config, messages: { ...block.config.messages, ar: value } },
          })
        }
      />
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">After message</span>
        <select
          value={behavior}
          onChange={(event) =>
            onChange({
              ...block,
              config: {
                ...block.config,
                messageBehavior: event.target.value as NonNullable<
                  VisualFlowNode["config"]["messageBehavior"]
                >,
                menuOptions:
                  event.target.value === "options"
                    ? block.config.menuOptions?.length
                      ? block.config.menuOptions
                      : [{ key: "option_1", label: { en: "Option", ar: "خيار" }, active: true }]
                    : block.config.menuOptions,
              },
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="next">Go to next step</option>
          <option value="options">Show options</option>
          <option value="end">End conversation</option>
          <option value="main_menu">Go to main menu</option>
          <option value="handoff">Human handoff</option>
        </select>
      </label>
      {behavior === "next" ? (
        <NextBlockSelect
          label="Target step"
          nodes={nodes}
          value={block.config.messageNextNodeId ?? ""}
          onChange={(value) =>
            onChange({ ...block, config: { ...block.config, messageNextNodeId: value } })
          }
        />
      ) : null}
      {behavior === "end" ? (
        <SettingsSection title="Conversation ends here">
          <p className="text-sm text-muted-foreground">
            No next block is required. After this message is sent, the bot stops the flow unless
            the customer starts again.
          </p>
          <TextAreaField
            label="Closing message EN"
            value={block.config.fallback?.en ?? ""}
            onChange={(value) =>
              onChange({
                ...block,
                config: { ...block.config, fallback: { ...block.config.fallback, en: value } },
              })
            }
          />
          <TextAreaField
            label="Closing message AR"
            value={block.config.fallback?.ar ?? ""}
            dir="rtl"
            onChange={(value) =>
              onChange({
                ...block,
                config: { ...block.config, fallback: { ...block.config.fallback, ar: value } },
              })
            }
          />
        </SettingsSection>
      ) : null}
    </div>
  );
}

function OptionsMessageSettings({
  block,
  nodes,
  visualFlow,
  businessId,
  onChange,
  onFlowChange,
}: {
  block: VisualFlowNode;
  nodes: VisualFlowNode[];
  visualFlow: VisualFlowDefinition;
  businessId?: string;
  onChange: (node: VisualFlowNode) => void;
  onFlowChange: (flow: VisualFlowDefinition) => void;
}) {
  return (
    <div className="space-y-4">
      <MessageStepSettings
        block={{ ...block, config: { ...block.config, messageBehavior: "options" } }}
        nodes={nodes}
        onChange={onChange}
      />
      <MenuOptionsEditor
        block={block}
        nodes={nodes}
        visualFlow={visualFlow}
        businessId={businessId}
        onChange={onChange}
        onFlowChange={onFlowChange}
        title="WhatsApp options customers see"
      />
      <SettingsSection title="Invalid input">
        <TextAreaField
          label="Fallback message EN"
          value={block.config.fallback?.en ?? ""}
          onChange={(value) =>
            onChange({
              ...block,
              config: { ...block.config, fallback: { ...block.config.fallback, en: value } },
            })
          }
        />
        <TextAreaField
          label="Fallback message AR"
          value={block.config.fallback?.ar ?? ""}
          dir="rtl"
          onChange={(value) =>
            onChange({
              ...block,
              config: { ...block.config, fallback: { ...block.config.fallback, ar: value } },
            })
          }
        />
        <NextBlockSelect
          label="Fallback target"
          nodes={nodes}
          value={block.config.messageFallbackNodeId ?? ""}
          onChange={(value) =>
            onChange({ ...block, config: { ...block.config, messageFallbackNodeId: value } })
          }
        />
      </SettingsSection>
    </div>
  );
}

function MainMenuBlockSettings({
  block,
  nodes,
  visualFlow,
  businessId,
  onChange,
  onFlowChange,
}: {
  block: VisualFlowNode;
  nodes: VisualFlowNode[];
  visualFlow: VisualFlowDefinition;
  businessId?: string;
  onChange: (node: VisualFlowNode) => void;
  onFlowChange: (flow: VisualFlowDefinition) => void;
}) {
  return (
    <div className="space-y-4">
      <SettingsSection title="Customer message">
        <TextAreaField
          label="Message EN"
          value={block.config.messages?.en ?? ""}
          onChange={(value) =>
            onChange({
              ...block,
              config: { ...block.config, messages: { ...block.config.messages, en: value } },
            })
          }
        />
        <TextAreaField
          label="Message AR"
          value={block.config.messages?.ar ?? ""}
          dir="rtl"
          onChange={(value) =>
            onChange({
              ...block,
              config: { ...block.config, messages: { ...block.config.messages, ar: value } },
            })
          }
        />
      </SettingsSection>
      <MenuOptionsEditor
        block={block}
        nodes={nodes}
        visualFlow={visualFlow}
        businessId={businessId}
        onChange={onChange}
        onFlowChange={onFlowChange}
        title="WhatsApp options customers see"
      />
    </div>
  );
}

function MenuOptionsEditor({
  block,
  nodes,
  visualFlow,
  businessId,
  title,
  onChange,
  onFlowChange,
}: {
  block: VisualFlowNode;
  nodes: VisualFlowNode[];
  visualFlow: VisualFlowDefinition;
  businessId?: string;
  title: string;
  onChange: (node: VisualFlowNode) => void;
  onFlowChange: (flow: VisualFlowDefinition) => void;
}) {
  const options = block.config.menuOptions ?? [];
  const activeOptionCount = options.filter((option) => option.active !== false).length;
  const canAddActiveOption = activeOptionCount < WHATSAPP_MAX_VISIBLE_OPTIONS;
  const updateOption = (index: number, option: VisualMenuOption) =>
    onChange({
      ...block,
      config: {
        ...block.config,
        menuOptions: options.map((entry, entryIndex) => (entryIndex === index ? option : entry)),
      },
    });
  const moveOption = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= options.length) return;
    const next = [...options];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange({ ...block, config: { ...block.config, menuOptions: next } });
  };
  return (
    <SettingsSection title={title}>
      <p className="text-xs text-muted-foreground">
        Edit the button/list text the customer sees in WhatsApp, then choose where each option sends
        them.
      </p>
      <p
        className={
          activeOptionCount > WHATSAPP_MAX_VISIBLE_OPTIONS
            ? "text-xs text-destructive"
            : "text-xs text-muted-foreground"
        }
      >
        WhatsApp can show only {WHATSAPP_MAX_VISIBLE_OPTIONS} active options under one message. This
        block currently has {activeOptionCount} active option
        {activeOptionCount === 1 ? "" : "s"}.
      </p>
      <div className="space-y-3">
        {options.map((option, index) => (
          <div
            key={`menu-option-${index}`}
            className="space-y-3 rounded-md border border-border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{option.label.en || `Option ${index + 1}`}</div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="studio-button-secondary px-2 py-1"
                  onClick={() => moveOption(index, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="studio-button-secondary px-2 py-1"
                  onClick={() => moveOption(index, 1)}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="studio-button-secondary px-2 py-1"
                  onClick={() =>
                    onChange({
                      ...block,
                      config: {
                        ...block.config,
                        menuOptions: options.filter((_, entryIndex) => entryIndex !== index),
                      },
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="WhatsApp button text EN"
                value={option.label.en}
                onChange={(value) =>
                  updateOption(index, { ...option, label: { ...option.label, en: value } })
                }
              />
              <TextField
                label="WhatsApp button text AR"
                value={option.label.ar}
                dir="rtl"
                onChange={(value) =>
                  updateOption(index, { ...option, label: { ...option.label, ar: value } })
                }
              />
            </div>
            <details className="rounded-md border border-border/70 bg-surface/20 px-3 py-2 text-sm">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Advanced option identity
              </summary>
              <div className="mt-3">
                <TextField
                  label="Stable option key"
                  value={option.key ?? option.action ?? ""}
                  onChange={(value) => updateOption(index, { ...option, key: value })}
                />
              </div>
            </details>
            <OptionResponseEditor
              visualFlow={visualFlow}
              sourceNode={block}
              option={option}
              optionIndex={index}
              nodes={nodes}
              businessId={businessId}
              onFlowChange={onFlowChange}
            />
            <ToggleField
              label="Active"
              checked={option.active !== false}
              disabled={
                option.active === false && activeOptionCount >= WHATSAPP_MAX_VISIBLE_OPTIONS
              }
              onChange={(checked) => {
                if (
                  checked &&
                  option.active === false &&
                  activeOptionCount >= WHATSAPP_MAX_VISIBLE_OPTIONS
                ) {
                  return;
                }
                updateOption(index, { ...option, active: checked });
              }}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={!canAddActiveOption}
        className="studio-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() =>
          onChange({
            ...block,
            config: {
              ...block.config,
              messageBehavior: "options",
              menuOptions: [
                ...options,
                {
                  key: `option_${options.length + 1}`,
                  label: { en: "New option", ar: "خيار جديد" },
                  active: true,
                },
              ],
            },
          })
        }
      >
        {canAddActiveOption ? "Add WhatsApp option" : "Maximum 3 active options"}
      </button>
    </SettingsSection>
  );
}

type OptionResponseKind = "send_text" | "send_image" | "talk_to_human" | "end" | "go_to_step";
type ResponseAfterBehavior = "return_here" | "end" | "main_menu" | "next";

const optionResponseKinds: Array<{ id: OptionResponseKind; label: string; help: string }> = [
  {
    id: "send_text",
    label: "Send text reply",
    help: "Customer taps the option and receives a normal WhatsApp text message.",
  },
  {
    id: "send_image",
    label: "Send image + caption",
    help: "Use for price lists, menus, flyers, or any image-based answer.",
  },
  {
    id: "talk_to_human",
    label: "Talk to human",
    help: "Pause automation and send the customer to support.",
  },
  {
    id: "end",
    label: "End conversation",
    help: "Stop the automated flow after this option is tapped.",
  },
  {
    id: "go_to_step",
    label: "Go to existing step",
    help: "Advanced: send this option to another block in the map.",
  },
];

function OptionResponseEditor({
  visualFlow,
  sourceNode,
  option,
  optionIndex,
  nodes,
  businessId,
  onFlowChange,
}: {
  visualFlow: VisualFlowDefinition;
  sourceNode: VisualFlowNode;
  option: VisualMenuOption;
  optionIndex: number;
  nodes: VisualFlowNode[];
  businessId?: string;
  onFlowChange: (flow: VisualFlowDefinition) => void;
}) {
  const target = nodes.find((node) => node.id === option.targetNodeId);
  const responseKind = inferOptionResponseKind(target);
  const selectedKind =
    optionResponseKinds.find((entry) => entry.id === responseKind) ?? optionResponseKinds[0];

  function applyKind(kind: OptionResponseKind) {
    if (kind === "go_to_step") return;
    onFlowChange(
      ensureOptionResponseTarget(visualFlow, {
        sourceNodeId: sourceNode.id,
        option,
        optionIndex,
        kind,
      }),
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-primary/25 bg-primary/5 p-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">When customer taps this option</span>
        <select
          value={responseKind}
          onChange={(event) => applyKind(event.target.value as OptionResponseKind)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          {optionResponseKinds.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">{selectedKind.help}</p>

      {responseKind === "send_text" && target ? (
        <TextOptionResponseFields
          block={target}
          sourceNodeId={sourceNode.id}
          nodes={nodes}
          visualFlow={visualFlow}
          onFlowChange={onFlowChange}
        />
      ) : null}
      {responseKind === "send_image" && target?.type === "SEND_IMAGE" ? (
        <ImageOptionResponseFields
          block={target}
          sourceNodeId={sourceNode.id}
          nodes={nodes}
          visualFlow={visualFlow}
          businessId={businessId}
          onFlowChange={onFlowChange}
        />
      ) : null}
      {responseKind === "talk_to_human" ? (
        <p className="rounded-md border border-border/80 bg-background px-3 py-2 text-xs text-muted-foreground">
          This option will pause the bot and send the configured human handoff message. Select the
          handoff step in the map to edit that support message.
        </p>
      ) : null}
      {responseKind === "end" ? (
        <p className="rounded-md border border-border/80 bg-background px-3 py-2 text-xs text-muted-foreground">
          This option ends the automated conversation. The customer can message again later to start
          a new flow.
        </p>
      ) : null}
      {responseKind === "go_to_step" ? (
        <NextBlockSelect
          label="Existing step"
          nodes={nodes}
          value={option.targetNodeId ?? ""}
          onChange={(targetNodeId) =>
            onFlowChange(setOptionTarget(visualFlow, sourceNode.id, optionIndex, targetNodeId))
          }
        />
      ) : null}
    </div>
  );
}

function TextOptionResponseFields({
  block,
  sourceNodeId,
  nodes,
  visualFlow,
  onFlowChange,
}: {
  block: VisualFlowNode;
  sourceNodeId: string;
  nodes: VisualFlowNode[];
  visualFlow: VisualFlowDefinition;
  onFlowChange: (flow: VisualFlowDefinition) => void;
}) {
  return (
    <div className="space-y-3">
      <TextAreaField
        label="Reply text EN"
        value={block.config.messages?.en ?? ""}
        onChange={(value) =>
          onFlowChange(
            updateVisualFlowNode(visualFlow, {
              ...block,
              config: { ...block.config, messages: { ...block.config.messages, en: value } },
            }),
          )
        }
      />
      <TextAreaField
        label="Reply text AR"
        value={block.config.messages?.ar ?? ""}
        dir="rtl"
        onChange={(value) =>
          onFlowChange(
            updateVisualFlowNode(visualFlow, {
              ...block,
              config: { ...block.config, messages: { ...block.config.messages, ar: value } },
            }),
          )
        }
      />
      <AfterResponseSelect
        block={block}
        sourceNodeId={sourceNodeId}
        nodes={nodes}
        visualFlow={visualFlow}
        onFlowChange={onFlowChange}
      />
    </div>
  );
}

function ImageOptionResponseFields({
  block,
  sourceNodeId,
  nodes,
  visualFlow,
  businessId,
  onFlowChange,
}: {
  block: VisualFlowNode;
  sourceNodeId: string;
  nodes: VisualFlowNode[];
  visualFlow: VisualFlowDefinition;
  businessId?: string;
  onFlowChange: (flow: VisualFlowDefinition) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    if (!businessId) {
      setUploadError("Open a business before uploading images.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const image = await uploadAdminFlowImage(businessId, file);
      onFlowChange(
        updateVisualFlowNode(visualFlow, {
          ...block,
          config: { ...block.config, mediaUrl: image.url },
        }),
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-background p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Image file</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload a JPG, PNG, or WebP price list/menu image.
            </p>
          </div>
          <label
            className={`studio-button-secondary cursor-pointer px-3 py-1.5 ${
              uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {uploading ? "Uploading..." : "Upload image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                void handleUpload(file);
              }}
            />
          </label>
        </div>
        {uploadError ? <p className="mt-2 text-xs text-destructive">{uploadError}</p> : null}
        {block.config.mediaUrl ? (
          <div className="mt-3 overflow-hidden rounded-md border border-border bg-surface/30">
            <img
              src={block.config.mediaUrl}
              alt="WhatsApp option image preview"
              className="max-h-40 w-full object-contain"
            />
          </div>
        ) : null}
      </div>
      <TextField
        label="Image URL"
        value={block.config.mediaUrl ?? ""}
        onChange={(value) =>
          onFlowChange(
            updateVisualFlowNode(visualFlow, {
              ...block,
              config: { ...block.config, mediaUrl: value },
            }),
          )
        }
      />
      <TextAreaField
        label="Caption EN"
        value={block.config.mediaCaption?.en ?? ""}
        onChange={(value) =>
          onFlowChange(
            updateVisualFlowNode(visualFlow, {
              ...block,
              config: {
                ...block.config,
                mediaCaption: { ...block.config.mediaCaption, en: value },
              },
            }),
          )
        }
      />
      <TextAreaField
        label="Caption AR"
        value={block.config.mediaCaption?.ar ?? ""}
        dir="rtl"
        onChange={(value) =>
          onFlowChange(
            updateVisualFlowNode(visualFlow, {
              ...block,
              config: {
                ...block.config,
                mediaCaption: { ...block.config.mediaCaption, ar: value },
              },
            }),
          )
        }
      />
      <AfterResponseSelect
        block={block}
        sourceNodeId={sourceNodeId}
        nodes={nodes}
        visualFlow={visualFlow}
        onFlowChange={onFlowChange}
      />
    </div>
  );
}

function AfterResponseSelect({
  block,
  sourceNodeId,
  nodes,
  visualFlow,
  onFlowChange,
}: {
  block: VisualFlowNode;
  sourceNodeId: string;
  nodes: VisualFlowNode[];
  visualFlow: VisualFlowDefinition;
  onFlowChange: (flow: VisualFlowDefinition) => void;
}) {
  const behavior = inferAfterResponseBehavior(block, sourceNodeId);
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">After sending this reply</span>
        <select
          value={behavior}
          onChange={(event) =>
            onFlowChange(
              updateVisualFlowNode(
                visualFlow,
                applyAfterResponseBehavior(block, sourceNodeId, event.target.value as ResponseAfterBehavior),
              ),
            )
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="return_here">Return to these options</option>
          <option value="end">End conversation</option>
          <option value="main_menu">Go to main menu</option>
          <option value="next">Go to another step</option>
        </select>
      </label>
      {behavior === "next" ? (
        <NextBlockSelect
          label="Next step"
          nodes={nodes}
          value={
            block.config.messageNextNodeId && block.config.messageNextNodeId !== sourceNodeId
              ? block.config.messageNextNodeId
              : ""
          }
          onChange={(targetNodeId) =>
            onFlowChange(
              updateVisualFlowNode(visualFlow, {
                ...block,
                config: {
                  ...block.config,
                  messageBehavior: "next",
                  messageNextNodeId: targetNodeId,
                },
              }),
            )
          }
        />
      ) : null}
    </div>
  );
}

function inferOptionResponseKind(target?: VisualFlowNode): OptionResponseKind {
  if (!target) return "go_to_step";
  if (target.type === "SEND_IMAGE") return "send_image";
  if (target.type === "HUMAN_HANDOFF") return "talk_to_human";
  if (target.type === "END") return "end";
  if (target.type === "SEND_MESSAGE" || target.type === "STORE_INFO") return "send_text";
  return "go_to_step";
}

function inferAfterResponseBehavior(block: VisualFlowNode, sourceNodeId: string): ResponseAfterBehavior {
  if (block.config.messageBehavior === "end") return "end";
  if (block.config.messageBehavior === "main_menu") return "main_menu";
  if (block.config.messageBehavior === "next" && block.config.messageNextNodeId === sourceNodeId) {
    return "return_here";
  }
  return "next";
}

function applyAfterResponseBehavior(
  block: VisualFlowNode,
  sourceNodeId: string,
  behavior: ResponseAfterBehavior,
): VisualFlowNode {
  if (behavior === "return_here") {
    return {
      ...block,
      config: { ...block.config, messageBehavior: "next", messageNextNodeId: sourceNodeId },
    };
  }
  if (behavior === "end") {
    return {
      ...block,
      config: { ...block.config, messageBehavior: "end", messageNextNodeId: undefined },
    };
  }
  if (behavior === "main_menu") {
    return {
      ...block,
      config: { ...block.config, messageBehavior: "main_menu", messageNextNodeId: undefined },
    };
  }
  return {
    ...block,
    config: {
      ...block.config,
      messageBehavior: "next",
      messageNextNodeId:
        block.config.messageNextNodeId === sourceNodeId ? undefined : block.config.messageNextNodeId,
    },
  };
}

function ensureOptionResponseTarget(
  visualFlow: VisualFlowDefinition,
  options: {
    sourceNodeId: string;
    option: VisualMenuOption;
    optionIndex: number;
    kind: Exclude<OptionResponseKind, "go_to_step">;
  },
): VisualFlowDefinition {
  const target = visualFlow.nodes.find((node) => node.id === options.option.targetNodeId);
  const label = options.option.label.en?.trim() || options.option.key?.trim() || "Option";

  if (options.kind === "talk_to_human") {
    const existing =
      target?.type === "HUMAN_HANDOFF"
        ? target
        : visualFlow.nodes.find((node) => node.type === "HUMAN_HANDOFF");
    const created = existing ? undefined : addResponseBlock(visualFlow, "HUMAN_HANDOFF", "Talk to human");
    const handoff = existing ?? created?.node;
    const flow = created?.flow ?? visualFlow;
    if (!handoff) return visualFlow;
    return setOptionTarget(flow, options.sourceNodeId, options.optionIndex, handoff.id);
  }

  if (options.kind === "end") {
    const existing =
      target?.type === "END" ? target : visualFlow.nodes.find((node) => node.type === "END");
    const created = existing ? undefined : addResponseBlock(visualFlow, "END", "End");
    const end = existing ?? created?.node;
    const flow = created?.flow ?? visualFlow;
    if (!end) return visualFlow;
    return setOptionTarget(flow, options.sourceNodeId, options.optionIndex, end.id);
  }

  if (options.kind === "send_image") {
    if (target?.type === "SEND_IMAGE") return visualFlow;
    if (
      target &&
      isSimpleResponseBlock(target) &&
      canConvertOptionTarget(visualFlow, options.sourceNodeId, target.id)
    ) {
      const converted: VisualFlowNode = {
        ...target,
        type: "SEND_IMAGE",
        title: target.title || `${label} image`,
        config: {
          ...target.config,
          mediaCaption: target.config.mediaCaption ?? target.config.messages,
          messageBehavior: "next",
          messageNextNodeId: options.sourceNodeId,
          menuOptions: undefined,
        },
      };
      return setOptionTarget(
        updateVisualFlowNode(visualFlow, converted),
        options.sourceNodeId,
        options.optionIndex,
        converted.id,
      );
    }
    const { flow, node } = addResponseBlock(
      visualFlow,
      "SEND_IMAGE",
      `${label} image`,
      options.sourceNodeId,
    );
    return setOptionTarget(flow, options.sourceNodeId, options.optionIndex, node.id);
  }

  if (target?.type === "SEND_MESSAGE" || target?.type === "STORE_INFO") return visualFlow;
  if (
    target &&
    isSimpleResponseBlock(target) &&
    canConvertOptionTarget(visualFlow, options.sourceNodeId, target.id)
  ) {
    const converted: VisualFlowNode = {
      ...target,
      type: "SEND_MESSAGE",
      title: target.title || `${label} reply`,
      config: {
        ...target.config,
        messages: target.config.messages ?? target.config.mediaCaption ?? { en: "", ar: "" },
        mediaUrl: undefined,
        mediaCaption: undefined,
        messageBehavior: "end",
        messageNextNodeId: undefined,
        menuOptions: undefined,
      },
    };
    return setOptionTarget(
      updateVisualFlowNode(visualFlow, converted),
      options.sourceNodeId,
      options.optionIndex,
      converted.id,
    );
  }
  const { flow, node } = addResponseBlock(visualFlow, "SEND_MESSAGE", `${label} reply`);
  return setOptionTarget(flow, options.sourceNodeId, options.optionIndex, node.id);
}

function addResponseBlock(
  visualFlow: VisualFlowDefinition,
  type: VisualFlowBlockType,
  title: string,
  returnToNodeId?: string,
) {
  const next = addConfiguredVisualNode(visualFlow, type, {
    title,
    nextNodeId: returnToNodeId,
  });
  const node = next.nodes[next.nodes.length - 1];
  const configured =
    type === "SEND_IMAGE"
      ? {
          ...node,
          config: {
            ...node.config,
            mediaCaption: node.config.mediaCaption ?? { en: title, ar: "" },
            messageBehavior: returnToNodeId ? "next" : node.config.messageBehavior,
            messageNextNodeId: returnToNodeId ?? node.config.messageNextNodeId,
          },
        }
      : node;
  const flow =
    configured === node
      ? next
      : {
          ...next,
          nodes: next.nodes.map((entry) => (entry.id === configured.id ? configured : entry)),
        };
  return { flow, node: configured };
}

function setOptionTarget(
  visualFlow: VisualFlowDefinition,
  sourceNodeId: string,
  optionIndex: number,
  targetNodeId: string,
): VisualFlowDefinition {
  return {
    ...visualFlow,
    nodes: visualFlow.nodes.map((node) =>
      node.id === sourceNodeId
        ? {
            ...node,
            config: {
              ...node.config,
              menuOptions: (node.config.menuOptions ?? []).map((option, index) =>
                index === optionIndex ? { ...option, targetNodeId } : option,
              ),
            },
          }
        : node,
    ),
  };
}

function updateVisualFlowNode(
  visualFlow: VisualFlowDefinition,
  updatedNode: VisualFlowNode,
): VisualFlowDefinition {
  return {
    ...visualFlow,
    nodes: visualFlow.nodes.map((node) => (node.id === updatedNode.id ? updatedNode : node)),
  };
}

function canConvertOptionTarget(
  visualFlow: VisualFlowDefinition,
  sourceNodeId: string,
  targetNodeId: string,
) {
  const incoming = getEffectiveVisualEdges(visualFlow).filter(
    (edge) => edge.targetNodeId === targetNodeId,
  );
  return incoming.length <= 1 && incoming.every((edge) => edge.sourceNodeId === sourceNodeId);
}

function isSimpleResponseBlock(node: VisualFlowNode) {
  return node.type === "SEND_MESSAGE" || node.type === "SEND_IMAGE";
}

function QuestionBlockSettings({
  block,
  nodes,
  onChange,
}: {
  block: VisualFlowNode;
  nodes: VisualFlowNode[];
  onChange: (node: VisualFlowNode) => void;
}) {
  const question =
    block.config.question ??
    ({
      key: "custom_question",
      type: "short_text",
      label: { en: "", ar: "" },
      helpText: { en: "", ar: "" },
      required: false,
      active: true,
      sortOrder: 1,
      choices: [],
    } satisfies FlowCustomQuestion);
  const updateQuestion = (next: FlowCustomQuestion) =>
    onChange({ ...block, config: { ...block.config, question: next } });
  const choices = question.choices ?? [];
  const moveChoice = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= choices.length) return;
    const nextChoices = [...choices];
    [nextChoices[index], nextChoices[nextIndex]] = [nextChoices[nextIndex], nextChoices[index]];
    updateQuestion({ ...question, choices: nextChoices });
  };
  return (
    <div className="space-y-4">
      <TextField
        label="Question key"
        value={question.key}
        onChange={(value) => updateQuestion({ ...question, key: value })}
      />
      <TextAreaField
        label="Question text EN"
        value={question.label.en}
        onChange={(value) =>
          updateQuestion({ ...question, label: { ...question.label, en: value } })
        }
      />
      <TextAreaField
        label="Question text AR"
        value={question.label.ar}
        dir="rtl"
        onChange={(value) =>
          updateQuestion({ ...question, label: { ...question.label, ar: value } })
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        <TextField
          label="Help text EN"
          value={question.helpText.en}
          onChange={(value) =>
            updateQuestion({ ...question, helpText: { ...question.helpText, en: value } })
          }
        />
        <TextField
          label="Help text AR"
          value={question.helpText.ar}
          dir="rtl"
          onChange={(value) =>
            updateQuestion({ ...question, helpText: { ...question.helpText, ar: value } })
          }
        />
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Type</span>
        <select
          value={question.type}
          onChange={(event) =>
            updateQuestion({ ...question, type: event.target.value as FlowQuestionType })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          {["short_text", "long_text", "number", "yes_no", "single_choice"].map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <ToggleField
        label="Required"
        checked={question.required}
        onChange={(checked) => updateQuestion({ ...question, required: checked })}
      />
      {question.type === "number" ? (
        <SettingsSection title="Number validation">
          <div className="grid gap-3 md:grid-cols-2">
            <TextField
              label="Optional min"
              value={question.minValue == null ? "" : String(question.minValue)}
              onChange={(value) =>
                updateQuestion({
                  ...question,
                  minValue: value.trim() ? Number(value) : null,
                })
              }
            />
            <TextField
              label="Optional max"
              value={question.maxValue == null ? "" : String(question.maxValue)}
              onChange={(value) =>
                updateQuestion({
                  ...question,
                  maxValue: value.trim() ? Number(value) : null,
                })
              }
            />
          </div>
        </SettingsSection>
      ) : null}
      {question.type === "single_choice" ? (
        <SettingsSection title="Choices">
          <div className="space-y-3">
            {choices.map((choice, index) => (
              <div
                key={`question-choice-${index}`}
                className="space-y-3 rounded-md border border-border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">Choice {index + 1}</div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="studio-button-secondary px-2 py-1"
                      onClick={() => moveChoice(index, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="studio-button-secondary px-2 py-1"
                      onClick={() => moveChoice(index, 1)}
                    >
                      Down
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField
                    label="Label EN"
                    value={choice.label.en}
                    onChange={(value) =>
                      updateQuestion({
                        ...question,
                        choices: choices.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, label: { ...entry.label, en: value } }
                            : entry,
                        ),
                      })
                    }
                  />
                  <TextField
                    label="Label AR"
                    value={choice.label.ar}
                    dir="rtl"
                    onChange={(value) =>
                      updateQuestion({
                        ...question,
                        choices: choices.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, label: { ...entry.label, ar: value } }
                            : entry,
                        ),
                      })
                    }
                  />
                </div>
                <TextField
                  label="Choice value/key"
                  value={choice.value}
                  onChange={(value) =>
                    updateQuestion({
                      ...question,
                      choices: choices.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, value } : entry,
                      ),
                    })
                  }
                />
                <NextBlockSelect
                  label="Optional target override"
                  nodes={nodes}
                  value={choice.targetNodeId ?? ""}
                  onChange={(value) =>
                    updateQuestion({
                      ...question,
                      choices: choices.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, targetNodeId: value } : entry,
                      ),
                    })
                  }
                />
                <ToggleField
                  label="Active"
                  checked={choice.active !== false}
                  onChange={(checked) =>
                    updateQuestion({
                      ...question,
                      choices: choices.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, active: checked } : entry,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="studio-button-secondary"
                  onClick={() =>
                    updateQuestion({
                      ...question,
                      choices: choices.filter((_, entryIndex) => entryIndex !== index),
                    })
                  }
                >
                  Delete choice
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="studio-button-secondary"
            onClick={() =>
              updateQuestion({
                ...question,
                choices: [
                  ...choices,
                  {
                    value: `choice_${choices.length + 1}`,
                    label: { en: "New choice", ar: "خيار جديد" },
                  },
                ],
              })
            }
          >
            Add choice
          </button>
        </SettingsSection>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Save answer to</span>
        <select
          value={block.config.questionSaveTo ?? "order"}
          onChange={(event) =>
            onChange({
              ...block,
              config: {
                ...block.config,
                questionSaveTo: event.target.value as NonNullable<
                  VisualFlowNode["config"]["questionSaveTo"]
                >,
              },
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          {["customer", "item", "cart", "order"].map((target) => (
            <option key={target} value={target}>
              {target}
            </option>
          ))}
        </select>
      </label>
      <NextBlockSelect
        label="Next block"
        nodes={nodes}
        value={block.config.questionNextNodeId ?? ""}
        onChange={(value) =>
          onChange({ ...block, config: { ...block.config, questionNextNodeId: value } })
        }
      />
      <NextBlockSelect
        label="Fallback block"
        nodes={nodes}
        value={block.config.questionFallbackNodeId ?? ""}
        onChange={(value) =>
          onChange({ ...block, config: { ...block.config, questionFallbackNodeId: value } })
        }
      />
      <SettingsSection title="Invalid or unclear answer">
        <TextAreaField
          label="Fallback message EN"
          value={block.config.fallback?.en ?? ""}
          onChange={(value) =>
            onChange({
              ...block,
              config: { ...block.config, fallback: { ...block.config.fallback, en: value } },
            })
          }
        />
        <TextAreaField
          label="Fallback message AR"
          value={block.config.fallback?.ar ?? ""}
          dir="rtl"
          onChange={(value) =>
            onChange({
              ...block,
              config: { ...block.config, fallback: { ...block.config.fallback, ar: value } },
            })
          }
        />
      </SettingsSection>
    </div>
  );
}

function ConditionBlockSettings({
  block,
  nodes,
  onChange,
}: {
  block: VisualFlowNode;
  nodes: VisualFlowNode[];
  onChange: (node: VisualFlowNode) => void;
}) {
  const rules = block.config.conditionRules ?? [];
  const updateRule = (index: number, rule: VisualConditionRule) =>
    onChange({
      ...block,
      config: {
        ...block.config,
        conditionRules: rules.map((entry, entryIndex) => (entryIndex === index ? rule : entry)),
      },
    });
  return (
    <div className="space-y-4">
      <TextField
        label="Condition source"
        value={block.config.conditionSource ?? ""}
        onChange={(value) =>
          onChange({ ...block, config: { ...block.config, conditionSource: value } })
        }
      />
      <SettingsSection title="Rules">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="border-b border-border py-2 pr-3 font-medium">Operator</th>
                <th className="border-b border-border py-2 pr-3 font-medium">Value</th>
                <th className="border-b border-border py-2 pr-3 font-medium">Target block</th>
                <th className="border-b border-border py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, index) => (
                <tr key={rule.id} className="border-b border-border/70 last:border-0">
                  <td className="py-2 pr-3 align-top">
                    <select
                      value={rule.operator}
                      onChange={(event) =>
                        updateRule(index, {
                          ...rule,
                          operator: event.target.value as VisualConditionRule["operator"],
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      {[
                        "equals",
                        "not_equals",
                        "contains",
                        "greater_than",
                        "less_than",
                        "is_empty",
                      ].map((operator) => (
                        <option key={operator} value={operator}>
                          {operator.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <input
                      value={rule.value}
                      onChange={(event) =>
                        updateRule(index, { ...rule, value: event.target.value })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    />
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <select
                      value={rule.targetNodeId ?? ""}
                      onChange={(event) =>
                        updateRule(index, { ...rule, targetNodeId: event.target.value })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="">Select block</option>
                      {nodes.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title} ({node.type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 align-top">
                    <button
                      type="button"
                      className="studio-button-secondary"
                      onClick={() =>
                        onChange({
                          ...block,
                          config: {
                            ...block.config,
                            conditionRules: rules.filter((_, entryIndex) => entryIndex !== index),
                          },
                        })
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="studio-button-secondary"
          onClick={() =>
            onChange({
              ...block,
              config: {
                ...block.config,
                conditionRules: [
                  ...rules,
                  { id: `rule_${rules.length + 1}`, operator: "equals", value: "" },
                ],
              },
            })
          }
        >
          Add rule
        </button>
      </SettingsSection>
      <NextBlockSelect
        label="Fallback target"
        nodes={nodes}
        value={block.config.conditionFallbackNodeId ?? ""}
        onChange={(value) =>
          onChange({ ...block, config: { ...block.config, conditionFallbackNodeId: value } })
        }
      />
    </div>
  );
}

function HandoffBlockSettings({
  block,
  onChange,
}: {
  block: VisualFlowNode;
  onChange: (node: VisualFlowNode) => void;
}) {
  const handoff = block.config.handoff ?? {
    pauseBot: true,
    ownerAlert: true,
    returnBehavior: "stay_paused" as const,
  };
  return (
    <div className="space-y-4">
      <TextAreaField
        label="Handoff message EN"
        value={block.config.messages?.en ?? ""}
        onChange={(value) =>
          onChange({
            ...block,
            config: { ...block.config, messages: { ...block.config.messages, en: value } },
          })
        }
      />
      <TextAreaField
        label="Handoff message AR"
        value={block.config.messages?.ar ?? ""}
        dir="rtl"
        onChange={(value) =>
          onChange({
            ...block,
            config: { ...block.config, messages: { ...block.config.messages, ar: value } },
          })
        }
      />
      <ToggleField
        label="Pause bot"
        checked={handoff.pauseBot}
        onChange={(checked) =>
          onChange({
            ...block,
            config: { ...block.config, handoff: { ...handoff, pauseBot: checked } },
          })
        }
      />
      <ToggleField
        label="Send owner alert"
        checked={handoff.ownerAlert}
        onChange={(checked) =>
          onChange({
            ...block,
            config: { ...block.config, handoff: { ...handoff, ownerAlert: checked } },
          })
        }
      />
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Return behavior</span>
        <select
          value={handoff.returnBehavior}
          onChange={(event) =>
            onChange({
              ...block,
              config: {
                ...block.config,
                handoff: {
                  ...handoff,
                  returnBehavior: event.target.value as typeof handoff.returnBehavior,
                },
              },
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="stay_paused">Stay paused</option>
          <option value="return_to_menu">Return to main menu</option>
          <option value="end_conversation">End conversation</option>
        </select>
      </label>
    </div>
  );
}

function AdvancedManualConnections({
  selectedBlock,
  visualFlow,
  onChange,
}: {
  selectedBlock: VisualFlowNode;
  visualFlow: VisualFlowDefinition;
  onChange: (flow: VisualFlowDefinition) => void;
}) {
  const [targetNodeId, setTargetNodeId] = useState("");
  return (
    <details className="rounded-md border border-border p-3 text-sm">
      <summary className="cursor-pointer font-medium">Advanced connection tools</summary>
      <div className="mt-3 grid gap-2">
        <NextBlockSelect
          label="Target block"
          nodes={visualFlow.nodes}
          value={targetNodeId}
          onChange={setTargetNodeId}
        />
        <button
          type="button"
          className="studio-button-secondary"
          onClick={() => onChange(connectVisualNodes(visualFlow, selectedBlock.id, targetNodeId))}
        >
          Add manual connection
        </button>
      </div>
    </details>
  );
}

function StepExplanation({ block }: { block: VisualFlowNode }) {
  return (
    <div className="rounded-md border border-border bg-surface/40 p-3 text-sm">
      <div className="font-medium">{friendlyBlockName(block.type)}</div>
      <p className="mt-1 text-muted-foreground">{stepDescription(block)}</p>
    </div>
  );
}

function StepIssueList({
  issues,
  visualFlow,
  onSelectBlock,
}: {
  issues: ReturnType<typeof validateVisualFlow>["issues"];
  visualFlow?: VisualFlowDefinition;
  onSelectBlock?: (blockId: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-surface/40 p-3">
      <div className="text-sm font-medium">Fixes for this step</div>
      {issues.map((issue, index) => {
        const target = visualFlow ? nodeForValidationIssue(visualFlow, issue.message) : undefined;
        return (
          <div key={`${issue.code}-${index}`} className="text-sm">
            <span className={issue.severity === "ERROR" ? "text-destructive" : "text-amber-200"}>
              {issue.severity === "ERROR" ? "Error" : "Warning"}:
            </span>{" "}
            <span className="text-muted-foreground">{humanizeValidationIssue(issue.message)}</span>
            {target && onSelectBlock ? (
              <button
                type="button"
                className="ml-2 text-primary underline-offset-4 hover:underline"
                onClick={() => onSelectBlock(target.id)}
              >
                Open {target.title || friendlyBlockName(target.type)}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function WhatsAppImageBubble({
  block,
  language,
}: {
  block: VisualFlowNode;
  language: "en" | "ar";
}) {
  const imageUrl = block.config.mediaUrl?.trim();
  const caption =
    block.config.mediaCaption?.[language]?.trim() ||
    block.config.mediaCaption?.en?.trim() ||
    block.config.messages?.[language]?.trim() ||
    block.config.messages?.en?.trim();
  return (
    <div className="space-y-2">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={caption || block.title || "WhatsApp image preview"}
          className="max-h-48 w-full rounded-md object-cover"
        />
      ) : (
        <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-[#2a3942] bg-black/20 text-xs text-white/55">
          Image URL not configured
        </div>
      )}
      {caption ? <div className="whitespace-pre-wrap">{caption}</div> : null}
    </div>
  );
}

function WhatsAppStepPreview({ block }: { block: VisualFlowNode }) {
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const message = previewMessageForBlock(block, language);
  const options =
    block.config.menuOptions
      ?.filter((option) => option.active !== false)
      .map((option) => option.label[language] || option.label.en) ?? [];
  const choices =
    block.type === "QUESTION" && block.config.question?.type === "single_choice"
      ? (block.config.question.choices ?? [])
          .filter((choice) => choice.active !== false)
          .map((choice) => choice.label[language] || choice.label.en)
      : [];
  return (
    <div className="rounded-md border border-border bg-[#0b141a] p-3 text-sm text-white">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.14em] text-white/50">WhatsApp preview</div>
        <div className="flex rounded-md border border-[#2a3942] p-0.5 text-xs">
          {(["en", "ar"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded px-2 py-1 ${language === item ? "bg-[#2a3942]" : ""}`}
              onClick={() => setLanguage(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-[90%] rounded-lg bg-[#1f2c34] px-3 py-2">
        {block.type === "SEND_IMAGE" ? (
          <WhatsAppImageBubble block={block} language={language} />
        ) : (
          <div className="whitespace-pre-wrap">{message}</div>
        )}
      </div>
      {[...options, ...choices].length ? (
        <div className="mt-2 max-w-[90%] space-y-1">
          {[...options, ...choices].slice(0, 10).map((option) => (
            <div
              key={option}
              className="rounded-md border border-[#2a3942] px-3 py-2 text-[#53bdeb]"
            >
              {option}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LivePreviewColumn({
  visualFlow,
  selectedBlock,
  botFlowSettings,
  orderConfirmationEnglish,
  orderConfirmationArabic,
}: {
  visualFlow: VisualFlowDefinition;
  selectedBlock?: VisualFlowNode;
  botFlowSettings?: BusinessBotFlowSettings;
  orderConfirmationEnglish?: string;
  orderConfirmationArabic?: string;
}) {
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [sampleReply, setSampleReply] = useState("");
  const block = selectedBlock;
  const previous = block ? previousBlockForPreview(visualFlow, block.id) : undefined;
  const shouldShowCustomerReply = Boolean(block && block.type !== "START");
  const userReply = sampleReply.trim() || sampleReplyForBlock(block, previous, language);
  const botMessage = block
    ? previewMessageForBlockWithRuntime(
        block,
        language,
        botFlowSettings,
        orderConfirmationEnglish,
        orderConfirmationArabic,
      )
    : "Select a block to preview.";
  const options = block ? previewOptionsForBlock(block, language) : [];
  const nextBlock = block ? nextBlockForPreview(visualFlow, block.id) : undefined;

  return (
    <aside className="min-h-0 min-w-0 overflow-y-auto rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Live preview</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Mock the customer reply and see how this WhatsApp step will appear.
          </p>
        </div>
        <div className="flex rounded-md border border-border p-0.5 text-xs">
          {(["en", "ar"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded px-2 py-1 ${language === item ? "bg-surface-2 text-foreground" : "text-muted-foreground"}`}
              onClick={() => setLanguage(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {shouldShowCustomerReply ? (
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-muted-foreground">Sample customer reply</span>
          <input
            value={sampleReply}
            onChange={(event) => setSampleReply(event.target.value)}
            placeholder={sampleReplyForBlock(block, previous, language)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
      ) : null}

      <div className="mt-4 rounded-lg border border-border bg-[#0b141a] p-3 text-sm text-white">
        <div className="mb-3 text-xs uppercase tracking-[0.14em] text-white/50">
          WhatsApp chat mockup
        </div>
        {previous ? (
          <div className="mb-2 max-w-[86%] rounded-lg bg-[#1f2c34] px-3 py-2">
            <div className="text-[11px] text-white/45">Previous bot message</div>
            <div className="mt-1 whitespace-pre-wrap">
              {previewMessageForBlockWithRuntime(
                previous,
                language,
                botFlowSettings,
                orderConfirmationEnglish,
                orderConfirmationArabic,
              )}
            </div>
          </div>
        ) : null}
        {shouldShowCustomerReply ? (
          <div className="mb-2 flex justify-end">
            <div className="max-w-[86%] rounded-lg bg-[#005c4b] px-3 py-2">
              <div className="text-[11px] text-white/45">Customer reply</div>
              <div className="mt-1 whitespace-pre-wrap">{userReply}</div>
            </div>
          </div>
        ) : null}
        <div className="max-w-[86%] rounded-lg bg-[#1f2c34] px-3 py-2">
          <div className="text-[11px] text-white/45">
            {block ? block.title || friendlyBlockName(block.type) : "Preview"}
          </div>
          <div className="mt-1">
            {block?.type === "SEND_IMAGE" ? (
              <WhatsAppImageBubble block={block} language={language} />
            ) : (
              <div className="whitespace-pre-wrap">{botMessage}</div>
            )}
          </div>
        </div>
        {options.length ? (
          <div className="mt-2 max-w-[86%] space-y-1">
            {options.map((option) => (
              <div key={option} className="rounded-md border border-[#2a3942] px-3 py-2 text-[#53bdeb]">
                {option}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-md border border-border bg-surface/30 p-3 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">What happens next</div>
        <div className="mt-1">
          {nextBlock
            ? `Continues to ${nextBlock.title || friendlyBlockName(nextBlock.type)}.`
            : block && isProtectedCommerceBlock(block)
              ? "Protected commerce logic continues internally until variants, required product questions, quantity, and add-to-cart are complete."
              : "No next block is configured yet."}
        </div>
      </div>
    </aside>
  );
}

function StepRunPreview({
  visualFlow,
  selectedBlockId,
}: {
  visualFlow: VisualFlowDefinition;
  selectedBlockId: string;
}) {
  const [mode, setMode] = useState<"start" | "selected">("selected");
  const [currentId, setCurrentId] = useState("");
  const [sampleReply, setSampleReply] = useState("");
  const [transcript, setTranscript] = useState<Array<{ speaker: "bot" | "admin"; text: string }>>(
    [],
  );
  const startId =
    mode === "start"
      ? visualFlow.nodes.find((node) => node.type === "START")?.id || selectedBlockId
      : selectedBlockId;
  const activeId = currentId || startId;
  const currentNode = visualFlow.nodes.find((node) => node.id === activeId);
  const outgoing = getEffectiveVisualEdges(visualFlow)
    .filter((edge) => edge.sourceNodeId === activeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function reset(nextMode = mode) {
    const nextStartId =
      nextMode === "start"
        ? visualFlow.nodes.find((node) => node.type === "START")?.id || selectedBlockId
        : selectedBlockId;
    setCurrentId(nextStartId);
    setSampleReply("");
    const node = visualFlow.nodes.find((entry) => entry.id === nextStartId);
    setTranscript(node ? [{ speaker: "bot", text: previewMessageForBlock(node) }] : []);
  }

  function moveTo(targetNodeId: string, adminText?: string) {
    const target = visualFlow.nodes.find((node) => node.id === targetNodeId);
    setCurrentId(targetNodeId);
    setSampleReply("");
    setTranscript((current) => [
      ...current,
      ...(adminText ? [{ speaker: "admin" as const, text: adminText }] : []),
      ...(target ? [{ speaker: "bot" as const, text: previewMessageForBlock(target) }] : []),
    ]);
  }

  useEffect(() => {
    reset(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedBlockId, visualFlow]);

  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">Conversation simulator</div>
          <div className="text-xs text-muted-foreground">
            Visual only. It does not send WhatsApp messages or modify customer sessions.
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className={
              mode === "start"
                ? "studio-button-primary px-2 py-1"
                : "studio-button-secondary px-2 py-1"
            }
            onClick={() => setMode("start")}
          >
            From start
          </button>
          <button
            type="button"
            className={
              mode === "selected"
                ? "studio-button-primary px-2 py-1"
                : "studio-button-secondary px-2 py-1"
            }
            onClick={() => setMode("selected")}
          >
            From here
          </button>
          <button
            type="button"
            className="studio-button-secondary px-2 py-1"
            onClick={() => reset()}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-md border border-border bg-[#0b141a] p-3 text-white">
        {transcript.map((entry, index) => (
          <div
            key={`${entry.speaker}-${index}`}
            className={entry.speaker === "admin" ? "flex justify-end" : ""}
          >
            <div
              className={`max-w-[84%] whitespace-pre-wrap rounded-lg px-3 py-2 ${
                entry.speaker === "admin" ? "bg-[#005c4b]" : "bg-[#1f2c34]"
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}
      </div>
      {currentNode ? (
        <div className="mt-3 space-y-2">
          {currentNode.config.menuOptions?.filter((option) => option.active !== false).length ? (
            <div className="flex flex-wrap gap-2">
              {(currentNode.config.menuOptions ?? [])
                .filter((option) => option.active !== false)
                .map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    disabled={!option.targetNodeId}
                    className="studio-button-secondary"
                    onClick={() =>
                      option.targetNodeId
                        ? moveTo(option.targetNodeId, option.label.en || option.key)
                        : undefined
                    }
                  >
                    {option.label.en || option.key}
                  </button>
                ))}
            </div>
          ) : null}
          {currentNode.type === "QUESTION" ? (
            <div className="space-y-2">
              {currentNode.config.question?.type === "single_choice" ? (
                <div className="flex flex-wrap gap-2">
                  {(currentNode.config.question.choices ?? [])
                    .filter((choice) => choice.active !== false)
                    .map((choice) => (
                      <button
                        key={choice.value}
                        type="button"
                        className="studio-button-secondary"
                        onClick={() =>
                          moveTo(
                            choice.targetNodeId || currentNode.config.questionNextNodeId || "",
                            choice.label.en || choice.value,
                          )
                        }
                        disabled={!choice.targetNodeId && !currentNode.config.questionNextNodeId}
                      >
                        {choice.label.en || choice.value}
                      </button>
                    ))}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={sampleReply}
                    onChange={(event) => setSampleReply(event.target.value)}
                    placeholder="Type a sample reply"
                    className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2"
                  />
                  <button
                    type="button"
                    className="studio-button-primary"
                    disabled={!currentNode.config.questionNextNodeId}
                    onClick={() =>
                      currentNode.config.questionNextNodeId
                        ? moveTo(
                            currentNode.config.questionNextNodeId,
                            sampleReply || "Sample reply",
                          )
                        : undefined
                    }
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          ) : null}
          {!currentNode.config.menuOptions?.length &&
          currentNode.type !== "QUESTION" &&
          outgoing[0] ? (
            <button
              type="button"
              className="studio-button-secondary"
              onClick={() => moveTo(outgoing[0].targetNodeId)}
            >
              Continue to{" "}
              {stepTargetLabel(
                visualFlow.nodes.find((node) => node.id === outgoing[0].targetNodeId),
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function simulatePreviewSteps(visualFlow: VisualFlowDefinition, startId: string) {
  const edges = getEffectiveVisualEdges(visualFlow);
  const steps: string[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = startId;
  while (currentId && steps.length < 8 && !visited.has(currentId)) {
    visited.add(currentId);
    const node = visualFlow.nodes.find((entry) => entry.id === currentId);
    if (!node) break;
    const message = previewMessageForBlock(node);
    steps.push(`${friendlyBlockName(node.type)}: ${message || "No message configured."}`);
    const nextEdge = edges
      .filter((edge) => edge.sourceNodeId === currentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];
    currentId = nextEdge?.targetNodeId;
  }
  return steps.length ? steps : ["No preview path is available from this step."];
}

function NextBlockSelect({
  label,
  nodes,
  value,
  onChange,
  onCreateNew,
}: {
  label: string;
  nodes: VisualFlowNode[];
  value: string;
  onChange: (value: string) => void;
  onCreateNew?: () => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          if (event.target.value === "__create_new_block__") {
            onCreateNew?.();
            return;
          }
          onChange(event.target.value);
        }}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      >
        <option value="">Select block</option>
        {onCreateNew ? <option value="__create_new_block__">+ Create new block...</option> : null}
        {nodes.map((node) => (
          <option key={node.id} value={node.id}>
            {node.title || friendlyBlockName(node.type)} ({friendlyBlockName(node.type)})
          </option>
        ))}
      </select>
    </label>
  );
}

function NextStepHint({ node }: { node?: VisualFlowNode }) {
  return (
    <p className="text-xs text-muted-foreground">
      Current next:{" "}
      <span className={node ? "text-foreground" : ""}>
        {node
          ? `${node.title || friendlyBlockName(node.type)} (${friendlyBlockName(node.type)})`
          : "Not set"}
      </span>
    </p>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-surface/40 p-3">
      <div className="text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function visualBlockSummary(node: VisualFlowNode) {
  if (node.type === "MAIN_MENU") {
    const count = (node.config.menuOptions ?? []).filter(
      (option) => option.active !== false,
    ).length;
    return `${count} active option${count === 1 ? "" : "s"}`;
  }
  if (node.type === "QUESTION") {
    const question = node.config.question;
    return question
      ? `${question.type.replaceAll("_", " ")} · ${question.required ? "required" : "optional"}`
      : "Question not configured";
  }
  if (node.type === "SEND_IMAGE") {
    return node.config.mediaUrl?.trim() ? "Image configured" : "Image URL missing";
  }
  if (node.type === "CONDITION") {
    const count = node.config.conditionRules?.length ?? 0;
    return `${count} rule${count === 1 ? "" : "s"}`;
  }
  if (node.type === "HUMAN_HANDOFF") {
    return node.config.handoff?.pauseBot === false ? "Pause disabled" : "Pause enabled";
  }
  return "Overview block";
}

function friendlyBlockName(type: VisualFlowBlockType) {
  const labels: Record<VisualFlowBlockType, string> = {
    START: "Entry point",
    SEND_MESSAGE: "Message",
    SEND_IMAGE: "Image reply",
    LANGUAGE_SELECTION: "Language selection",
    MAIN_MENU: "Main menu",
    STORE_INFO: "Store info",
    CATEGORY_SELECTION: "Browse routes",
    PRODUCT_SELECTION: "Product purchase",
    PRODUCT_DETAILS: "Product details",
    PRODUCT_OPTIONS: "Product options",
    CUSTOM_FIELDS: "Product questions",
    QUANTITY: "Quantity",
    QUESTION: "Question",
    CONDITION: "Condition",
    CART_REVIEW: "Cart review",
    CHECKOUT_CUSTOMER_NAME: "Customer name",
    CHECKOUT_FULFILLMENT: "Fulfillment method",
    CHECKOUT_DELIVERY_DETAILS: "Delivery details",
    CHECKOUT_PAYMENT_METHOD: "Payment method",
    CHECKOUT_NOTES: "Order notes",
    ORDER_REVIEW: "Order review",
    ORDER_CONFIRMATION: "Confirmation",
    HUMAN_HANDOFF: "Talk to human",
    GO_TO_MAIN_MENU: "Go to main menu",
    END: "End conversation",
  };
  return labels[type];
}

function stepPrimaryText(node: VisualFlowNode) {
  if (node.type === "START") {
    if (node.config.startBehavior === "language_first") return "Starts by asking for language.";
    if (node.config.startBehavior === "main_menu") return "Goes directly to Main Menu.";
    if (node.config.startBehavior === "custom_step") return "Starts from a custom first step.";
    return "Entry routing step.";
  }
  if (node.type === "QUESTION") return node.config.question?.label.en ?? "";
  if (node.type === "SEND_IMAGE") {
    return node.config.mediaCaption?.en ?? node.config.mediaUrl ?? "Image reply";
  }
  if (node.type === "CONDITION") {
    return node.config.conditionSource
      ? `Checks ${node.config.conditionSource}`
      : "Condition source is not set.";
  }
  return node.config.messages?.en ?? node.config.labels?.en ?? "";
}

function previewMessageForBlock(block: VisualFlowNode, language: "en" | "ar" = "en") {
  const configuredCopy =
    block.config.messages?.[language]?.trim() ||
    block.config.labels?.[language]?.trim() ||
    block.config.messages?.en?.trim() ||
    block.config.labels?.en?.trim();
  if (configuredCopy) return configuredCopy;

  if (block.type === "START") {
    if (block.config.startBehavior === "language_first") return "Choose your language:";
    if (block.config.startBehavior === "main_menu")
      return "Next visible message comes from Main Menu.";
    return "Entry point controls routing. Edit visible copy on the next message step.";
  }
  if (block.type === "QUESTION") {
    return (
      block.config.question?.label[language] ||
        block.config.question?.label.en ||
        "No question configured yet."
    );
  }
  if (block.type === "SEND_IMAGE") {
    return (
      block.config.mediaCaption?.[language]?.trim() ||
      block.config.mediaCaption?.en?.trim() ||
      (block.config.mediaUrl?.trim() ? "Image message" : "No image configured yet.")
    );
  }
  if (block.type === "MAIN_MENU" || block.config.menuOptions?.length) {
    return "No menu message configured yet.";
  }
  if (block.type === "CATEGORY_SELECTION") {
    return language === "ar"
      ? "\u0643\u064a\u0641 \u062a\u0631\u064a\u062f \u0627\u0644\u062a\u0635\u0641\u062d\u061f"
      : "How would you like to browse?";
  }
  return "No message configured yet.";
}

function previewMessageForBlockWithRuntime(
  block: VisualFlowNode,
  language: "en" | "ar",
  settings?: BusinessBotFlowSettings,
  orderConfirmationEnglish?: string,
  orderConfirmationArabic?: string,
) {
  const runtimeMessage = checkoutPromptForBlock(
    block,
    settings,
    language === "ar" ? orderConfirmationArabic : orderConfirmationEnglish,
    language,
  );
  return runtimeMessage || previewMessageForBlock(block, language);
}

function checkoutPromptForBlock(
  block: VisualFlowNode,
  settings?: BusinessBotFlowSettings,
  orderConfirmationMessage?: string,
  language: "en" | "ar" = "en",
) {
  if (!settings) return "";
  const pick = (english: string, arabic: string) =>
    language === "ar" ? arabic.trim() || english : english;
  if (block.type === "CHECKOUT_CUSTOMER_NAME") {
    return pick(settings.customerNamePromptEnglish, settings.customerNamePromptArabic);
  }
  if (block.type === "CHECKOUT_FULFILLMENT") {
    return pick(settings.fulfillmentPromptEnglish, settings.fulfillmentPromptArabic);
  }
  if (block.type === "CHECKOUT_DELIVERY_DETAILS") {
    const addressPrompt = pick(
      settings.deliveryAddressPromptEnglish,
      settings.deliveryAddressPromptArabic,
    );
    const areaPrompt = pick(settings.deliveryAreaPromptEnglish, settings.deliveryAreaPromptArabic);
    const pickupPrompt = pick(
      settings.pickupLocationPromptEnglish,
      settings.pickupLocationPromptArabic,
    );
    return `${areaPrompt}\n${pickupPrompt}\n${addressPrompt}`;
  }
  if (block.type === "CHECKOUT_PAYMENT_METHOD") {
    return pick(settings.paymentMethodPromptEnglish, settings.paymentMethodPromptArabic);
  }
  if (block.type === "CHECKOUT_NOTES") {
    return pick(settings.orderNotesPromptEnglish, settings.orderNotesPromptArabic);
  }
  if (block.type === "ORDER_REVIEW") {
    return language === "ar"
      ? "يعرض ملخص الطلب ثم يطلب من العميل التأكيد."
      : "Shows the order summary, then asks the customer to confirm.";
  }
  if (block.type === "ORDER_CONFIRMATION") {
    return (
      orderConfirmationMessage?.trim() ||
      (language === "ar"
        ? "تم استلام طلبك وهو بانتظار التأكيد."
        : "Your order has been received and is waiting for confirmation.")
    );
  }
  return "";
}

function previewOptionsForBlock(block: VisualFlowNode, language: "en" | "ar") {
  if (block.config.menuOptions?.length) {
    return block.config.menuOptions
      .filter((option) => option.active !== false)
      .map((option) => option.label[language] || option.label.en || option.key)
      .slice(0, WHATSAPP_MAX_VISIBLE_OPTIONS);
  }
  if (block.type === "QUESTION" && block.config.question?.type === "single_choice") {
    return (block.config.question.choices ?? [])
      .filter((choice) => choice.active !== false)
      .map((choice) => choice.label[language] || choice.label.en || choice.value)
      .slice(0, 10);
  }
  if (block.type === "LANGUAGE_SELECTION") return ["English", "العربية"];
  if (block.type === "CATEGORY_SELECTION") {
    return (block.config.browseRoutes?.length ? block.config.browseRoutes : defaultBrowseRoutes())
      .filter((route) => route.active !== false)
      .map((route) => route.label[language] || route.label.en || route.key)
      .slice(0, 10);
  }
  if (block.type === "PRODUCT_DETAILS") return ["Order this item", "Back to products", "Main menu"];
  return [];
}

function previousBlockForPreview(visualFlow: VisualFlowDefinition, blockId: string) {
  const edge = getEffectiveVisualEdges(visualFlow).find((entry) => entry.targetNodeId === blockId);
  return edge ? visualFlow.nodes.find((node) => node.id === edge.sourceNodeId) : undefined;
}

function nextBlockForPreview(visualFlow: VisualFlowDefinition, blockId: string) {
  const edge = primaryNextEdge(blockId, getEffectiveVisualEdges(visualFlow));
  return edge ? visualFlow.nodes.find((node) => node.id === edge.targetNodeId) : undefined;
}

function sampleReplyForBlock(
  block: VisualFlowNode | undefined,
  previous: VisualFlowNode | undefined,
  language: "en" | "ar",
) {
  if (!block) return "";
  if (previous?.config.menuOptions?.length) {
    const option = previous.config.menuOptions.find((entry) => entry.targetNodeId === block.id);
    if (option) return option.label[language] || option.label.en || option.key;
  }
  if (block.type === "LANGUAGE_SELECTION") return "Hi";
  if (block.type === "MAIN_MENU") return language === "ar" ? "العربية" : "English";
  if (block.type === "CATEGORY_SELECTION") return "Place an order";
  if (block.type === "PRODUCT_SELECTION") return "Selected category";
  if (block.type === "PRODUCT_DETAILS") return "Selected product";
  if (block.type === "CART_REVIEW") return "2";
  if (block.type === "CHECKOUT_FULFILLMENT") return "Checkout";
  if (block.type === "ORDER_REVIEW") return "Delivery details";
  if (block.type === "ORDER_CONFIRMATION") return "1";
  return "Customer reply";
}

function isProtectedCommerceBlock(block: VisualFlowNode) {
  return block.type === "PRODUCT_SELECTION" || block.type === "PRODUCT_DETAILS";
}

function isCheckoutRuntimeBlock(block: VisualFlowNode) {
  return (
    block.type === "CHECKOUT_CUSTOMER_NAME" ||
    block.type === "CHECKOUT_FULFILLMENT" ||
    block.type === "CHECKOUT_DELIVERY_DETAILS" ||
    block.type === "CHECKOUT_PAYMENT_METHOD" ||
    block.type === "CHECKOUT_NOTES" ||
    block.type === "ORDER_REVIEW" ||
    block.type === "ORDER_CONFIRMATION"
  );
}

function isLegacyCommerceInternalNode(node: VisualFlowNode) {
  return ["product_options", "custom_fields", "quantity"].includes(node.id);
}

function nodeForValidationIssue(visualFlow: VisualFlowDefinition, message: string) {
  const normalized = message.toLowerCase();
  return visualFlow.nodes.find((node) => {
    const labels = [
      node.id,
      node.title,
      friendlyBlockName(node.type),
      node.type,
      node.type === "PRODUCT_SELECTION" ? "Product purchase" : "",
      node.type === "CATEGORY_SELECTION" ? "Show categories" : "",
    ];
    return labels
      .filter(Boolean)
      .some((label) => normalized.includes(String(label).toLowerCase()));
  });
}

function stepTargetLabel(node?: VisualFlowNode) {
  if (!node) return "Not selected";
  return `${node.title || friendlyBlockName(node.type)} (${friendlyBlockName(node.type)})`;
}

function humanRouteLabel(label?: string | null) {
  if (!label) return "Next";
  const clean = label
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("Main Menu", "Main menu");
  if (clean === "Answer") return "After answer";
  if (clean === "Fallback") return "If customer response is not understood";
  if (clean === "Entry") return "First step";
  return clean;
}

function stepDescription(block: VisualFlowNode) {
  if (block.type === "START")
    return "Controls what happens when a customer first messages the bot.";
  if (block.type === "CATEGORY_SELECTION")
    return "Starts the protected product purchase path. Customers choose a category, then a product.";
  if (block.type === "PRODUCT_SELECTION")
    return "Lets customers choose a product. Variants, required product questions, quantity, and add-to-cart are enforced automatically.";
  if (block.type === "PRODUCT_DETAILS")
    return "Shows the selected product. Ordering this item always runs required variants, product questions, quantity, and add-to-cart before cart.";
  if (block.type === "SEND_IMAGE")
    return "Sends a WhatsApp image message, then follows the configured next step.";
  if (block.config.menuOptions?.length)
    return "Shows a message and lets the customer choose an option.";
  if (block.type === "QUESTION")
    return "Collects an answer from the customer and stores it for later.";
  if (block.type === "CONDITION") return "Routes the customer based on rules you define.";
  if (block.type === "HUMAN_HANDOFF")
    return "Pauses automation and directs the customer to a human.";
  return "Shows content or moves the customer to the next step.";
}

function humanizeValidationIssue(message: string) {
  if (message.includes("Human handoff") && message.includes("not reachable")) {
    return "The Talk to human step exists, but no menu option leads to it. Add a Talk to human option in Main Menu or another options step.";
  }
  if (message.includes("not reachable from START")) {
    return `${message.replace("START", "Entry point")} Connect this step from the outline or choose it as a target in an options list.`;
  }
  if (message.includes("has no outgoing connection")) {
    return `${message} Choose what happens after this step in the settings panel.`;
  }
  return message
    .replaceAll("START", "Entry point")
    .replaceAll("MAIN_MENU", "Main menu")
    .replaceAll("HUMAN_HANDOFF", "Talk to human");
}

function issuesForStep(
  validation: ReturnType<typeof validateVisualFlow> | undefined,
  node: VisualFlowNode,
) {
  if (!validation?.issues.length) return [];
  const labels = [
    node.id,
    node.title,
    friendlyBlockName(node.type),
    node.type,
    node.type === "HUMAN_HANDOFF" ? "Talk to human" : "",
    node.type === "START" ? "Entry point" : "",
  ].filter(Boolean);
  return validation.issues.filter((issue) =>
    labels.some((label) => issue.message.toLowerCase().includes(label.toLowerCase())),
  );
}

function GeneralFlowEditor({
  editor,
  onChange,
}: {
  editor: FlowEditorModel;
  onChange: (updater: (current: FlowEditorModel) => FlowEditorModel) => void;
}) {
  return (
    <EditorPanel>
      <TextField
        label="Flow name"
        value={editor.name}
        onChange={(value) => onChange((current) => ({ ...current, name: value }))}
      />
      <TextAreaField
        label="Description"
        value={editor.description}
        onChange={(value) => onChange((current) => ({ ...current, description: value }))}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleField
          label="English"
          checked={editor.supportedLanguages.includes("en")}
          onChange={(checked) =>
            onChange((current) => ({
              ...current,
              supportedLanguages: checked
                ? [...new Set([...current.supportedLanguages, "en" as const])]
                : current.supportedLanguages.filter((language) => language !== "en"),
            }))
          }
        />
        <ToggleField
          label="Arabic"
          checked={editor.supportedLanguages.includes("ar")}
          onChange={(checked) =>
            onChange((current) => ({
              ...current,
              supportedLanguages: checked
                ? [...new Set([...current.supportedLanguages, "ar" as const])]
                : current.supportedLanguages.filter((language) => language !== "ar"),
            }))
          }
        />
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Default language</span>
        <select
          value={editor.defaultLanguage}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              defaultLanguage: event.target.value === "ar" ? "ar" : "en",
            }))
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="en">English</option>
          <option value="ar">Arabic</option>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["allowRestart", "Restart command"],
          ["allowMenu", "Menu command"],
          ["allowBack", "Back command"],
          ["allowCart", "Cart command"],
          ["allowHumanHandoff", "Human handoff"],
        ].map(([key, label]) => (
          <ToggleField
            key={key}
            label={label}
            checked={Boolean(editor.commands[key as keyof FlowEditorModel["commands"]])}
            disabled={key === "allowRestart"}
            onChange={(checked) =>
              onChange((current) => ({
                ...current,
                commands: { ...current.commands, [key]: checked },
              }))
            }
          />
        ))}
      </div>
    </EditorPanel>
  );
}

function CopyFlowEditor({
  editor,
  onChange,
}: {
  editor: FlowEditorModel;
  onChange: (updater: (current: FlowEditorModel) => FlowEditorModel) => void;
}) {
  return (
    <EditorPanel>
      <CopyPairFields
        field="welcome"
        label="Welcome / main menu intro"
        editor={editor}
        onChange={onChange}
      />
      <CopyPairFields
        field="customerNamePrompt"
        label="Customer name prompt"
        editor={editor}
        onChange={onChange}
      />
      <CopyPairFields
        field="fulfillmentPrompt"
        label="Fulfillment prompt"
        editor={editor}
        onChange={onChange}
      />
      <CopyPairFields
        field="orderNotesPrompt"
        label="Order notes prompt"
        editor={editor}
        onChange={onChange}
      />
      <CopyPairFields
        field="noNotesButton"
        label="No notes button"
        editor={editor}
        onChange={onChange}
      />
    </EditorPanel>
  );
}

function MainMenuFlowEditor({
  editor,
  nodes,
  onChange,
}: {
  editor: FlowEditorModel;
  nodes: FlowDefinition["nodes"];
  onChange: (updater: (current: FlowEditorModel) => FlowEditorModel) => void;
}) {
  const moveOption = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= editor.mainMenuOptions.length) return;
    onChange((current) => {
      const nextOptions = [...current.mainMenuOptions];
      [nextOptions[index], nextOptions[nextIndex]] = [nextOptions[nextIndex], nextOptions[index]];
      return {
        ...current,
        mainMenuOptions: nextOptions.map((option, optionIndex) => ({
          ...option,
          sortOrder: optionIndex + 1,
        })),
      };
    });
  };
  const updateOption = (
    index: number,
    updater: (
      option: FlowEditorModel["mainMenuOptions"][number],
    ) => FlowEditorModel["mainMenuOptions"][number],
  ) =>
    onChange((current) => ({
      ...current,
      mainMenuOptions: current.mainMenuOptions.map((option, optionIndex) =>
        optionIndex === index ? updater(option) : option,
      ),
    }));

  return (
    <EditorPanel>
      <TextAreaField
        label="Menu message EN"
        value={editor.copy.welcome.en}
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            copy: { ...current.copy, welcome: { ...current.copy.welcome, en: value } },
          }))
        }
      />
      <TextAreaField
        label="Menu message AR"
        value={editor.copy.welcome.ar}
        dir="rtl"
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            copy: { ...current.copy, welcome: { ...current.copy.welcome, ar: value } },
          }))
        }
      />
      <SettingsSection title="Menu options">
        <div className="space-y-3">
          {editor.mainMenuOptions.map((option, index) => (
            <div
              key={`editor-main-menu-option-${index}`}
              className="space-y-3 rounded-md border border-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Option {index + 1}</div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="studio-button-secondary px-2 py-1"
                    onClick={() => moveOption(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="studio-button-secondary px-2 py-1"
                    onClick={() => moveOption(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="studio-button-secondary px-2 py-1"
                    onClick={() =>
                      onChange((current) => ({
                        ...current,
                        mainMenuOptions: current.mainMenuOptions.filter(
                          (_, optionIndex) => optionIndex !== index,
                        ),
                      }))
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <TextField
                  label="Label EN"
                  value={option.label.en}
                  onChange={(value) =>
                    updateOption(index, (current) => ({
                      ...current,
                      label: { ...current.label, en: value },
                    }))
                  }
                />
                <TextField
                  label="Label AR"
                  value={option.label.ar}
                  dir="rtl"
                  onChange={(value) =>
                    updateOption(index, (current) => ({
                      ...current,
                      label: { ...current.label, ar: value },
                    }))
                  }
                />
              </div>
              <TextField
                label="Option key"
                value={option.key}
                onChange={(value) => updateOption(index, (current) => ({ ...current, key: value }))}
              />
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Target block</span>
                <select
                  value={option.targetNodeId ?? ""}
                  onChange={(event) =>
                    updateOption(index, (current) => ({
                      ...current,
                      targetNodeId: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="">Select block</option>
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.id} ({node.type})
                    </option>
                  ))}
                </select>
              </label>
              <ToggleField
                label="Active"
                checked={option.active}
                onChange={(checked) =>
                  updateOption(index, (current) => ({ ...current, active: checked }))
                }
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="studio-button-secondary"
          onClick={() =>
            onChange((current) => ({
              ...current,
              mainMenuOptions: [
                ...current.mainMenuOptions,
                {
                  key: `option_${current.mainMenuOptions.length + 1}`,
                  label: { en: "New option", ar: "خيار جديد" },
                  active: true,
                  sortOrder: current.mainMenuOptions.length + 1,
                },
              ],
            }))
          }
        >
          Add option
        </button>
      </SettingsSection>
      <CopyPairFields
        field="questionResponse"
        label="Ask question response"
        editor={editor}
        onChange={onChange}
        multiline
      />
      <div className="rounded-md border border-border bg-background p-4 text-sm">
        <div className="font-medium">Shared with visual builder</div>
        <p className="mt-2 text-muted-foreground">
          These are the same main menu options shown in the visual builder. Saving here updates the
          active option list used by preview and publishing.
        </p>
      </div>
    </EditorPanel>
  );
}

function StoreInfoFlowEditor({
  editor,
  onChange,
}: {
  editor: FlowEditorModel;
  onChange: (updater: (current: FlowEditorModel) => FlowEditorModel) => void;
}) {
  return (
    <EditorPanel>
      <CopyPairFields
        field="infoResponse"
        label="Store info response"
        editor={editor}
        onChange={onChange}
        multiline
      />
      {(["openingHours", "location", "contact"] as const).map((key) => (
        <TextField
          key={key}
          label={labelize(key)}
          value={editor.storeInfo[key]}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              storeInfo: { ...current.storeInfo, [key]: value },
            }))
          }
        />
      ))}
    </EditorPanel>
  );
}

function OrderingFlowEditor({
  editor,
  onChange,
}: {
  editor: FlowEditorModel;
  onChange: (updater: (current: FlowEditorModel) => FlowEditorModel) => void;
}) {
  return (
    <EditorPanel>
      {Object.entries(editor.ordering).map(([key, checked]) => (
        <ToggleField
          key={key}
          label={labelize(key)}
          checked={checked}
          disabled={key === "allowUnavailableOrdering"}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              ordering: { ...current.ordering, [key]: value },
            }))
          }
        />
      ))}
      <p className="text-sm text-muted-foreground">
        Stock validation, server-side totals, order review, and order creation are always protected
        by backend services.
      </p>
    </EditorPanel>
  );
}

function CheckoutFlowEditor({
  editor,
  onChange,
}: {
  editor: FlowEditorModel;
  onChange: (updater: (current: FlowEditorModel) => FlowEditorModel) => void;
}) {
  return (
    <EditorPanel>
      {Object.entries(editor.checkout).map(([key, checked]) => (
        <ToggleField
          key={key}
          label={labelize(key)}
          checked={checked}
          disabled={key === "showFinalReview" || key === "requireFinalConfirmation"}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              checkout: { ...current.checkout, [key]: value },
            }))
          }
        />
      ))}
      <p className="text-sm text-muted-foreground">
        Final review and confirmation cannot be disabled. Business checkout settings remain the
        source of truth for fees, payment methods, pickup, and delivery.
      </p>
    </EditorPanel>
  );
}

function CustomQuestionsFlowEditor({
  editor,
  onChange,
}: {
  editor: FlowEditorModel;
  onChange: (updater: (current: FlowEditorModel) => FlowEditorModel) => void;
}) {
  function updateQuestion(index: number, question: FlowCustomQuestion) {
    onChange((current) => ({
      ...current,
      customQuestions: current.customQuestions.map((entry, entryIndex) =>
        entryIndex === index ? question : entry,
      ),
    }));
  }

  return (
    <EditorPanel>
      <button
        type="button"
        className="studio-button-secondary w-fit"
        onClick={() =>
          onChange((current) => ({
            ...current,
            customQuestions: [
              ...current.customQuestions,
              {
                key: `question_${current.customQuestions.length + 1}`,
                type: "short_text",
                label: { en: "Custom question", ar: "سؤال مخصص" },
                helpText: { en: "", ar: "" },
                required: false,
                active: true,
                sortOrder: current.customQuestions.length + 1,
                choices: [],
              },
            ],
          }))
        }
      >
        Add question
      </button>
      {editor.customQuestions.map((question, index) => (
        <div
          key={`custom-question-${index}`}
          className="space-y-3 rounded-md border border-border p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Internal key"
              value={question.key}
              onChange={(value) => updateQuestion(index, { ...question, key: value })}
            />
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Type</span>
              <select
                value={question.type}
                onChange={(event) =>
                  updateQuestion(index, {
                    ...question,
                    type: event.target.value as FlowCustomQuestion["type"],
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="short_text">Short text</option>
                <option value="long_text">Long text</option>
                <option value="number">Number</option>
                <option value="yes_no">Yes / no</option>
                <option value="single_choice">Single choice</option>
              </select>
            </label>
          </div>
          <TextField
            label="Label EN"
            value={question.label.en}
            onChange={(value) =>
              updateQuestion(index, { ...question, label: { ...question.label, en: value } })
            }
          />
          <TextField
            label="Label AR"
            value={question.label.ar}
            dir="rtl"
            onChange={(value) =>
              updateQuestion(index, { ...question, label: { ...question.label, ar: value } })
            }
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <ToggleField
              label="Required"
              checked={question.required}
              onChange={(value) => updateQuestion(index, { ...question, required: value })}
            />
            <ToggleField
              label="Active"
              checked={question.active}
              onChange={(value) => updateQuestion(index, { ...question, active: value })}
            />
            <TextField
              label="Sort order"
              value={String(question.sortOrder)}
              onChange={(value) =>
                updateQuestion(index, { ...question, sortOrder: Number(value) || 0 })
              }
            />
          </div>
        </div>
      ))}
    </EditorPanel>
  );
}

function HandoffFlowEditor({
  editor,
  onChange,
}: {
  editor: FlowEditorModel;
  onChange: (updater: (current: FlowEditorModel) => FlowEditorModel) => void;
}) {
  return (
    <EditorPanel>
      <ToggleField
        label="Enable human handoff"
        checked={editor.humanHandoff.enabled}
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            humanHandoff: { ...current.humanHandoff, enabled: value },
            commands: { ...current.commands, allowHumanHandoff: value },
          }))
        }
      />
      <TextField
        label="Button label EN"
        value={editor.humanHandoff.label.en}
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            humanHandoff: {
              ...current.humanHandoff,
              label: { ...current.humanHandoff.label, en: value },
            },
          }))
        }
      />
      <TextField
        label="Button label AR"
        value={editor.humanHandoff.label.ar}
        dir="rtl"
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            humanHandoff: {
              ...current.humanHandoff,
              label: { ...current.humanHandoff.label, ar: value },
            },
          }))
        }
      />
      <TextAreaField
        label="Response EN"
        value={editor.humanHandoff.response.en}
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            humanHandoff: {
              ...current.humanHandoff,
              response: { ...current.humanHandoff.response, en: value },
            },
          }))
        }
      />
      <TextAreaField
        label="Response AR"
        value={editor.humanHandoff.response.ar}
        dir="rtl"
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            humanHandoff: {
              ...current.humanHandoff,
              response: { ...current.humanHandoff.response, ar: value },
            },
          }))
        }
      />
      <TextField
        label="Max invalid attempts"
        value={String(editor.humanHandoff.maxInvalidAttempts)}
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            humanHandoff: {
              ...current.humanHandoff,
              maxInvalidAttempts: Math.max(1, Number(value) || 1),
            },
          }))
        }
      />
      <TextAreaField
        label="Owner support note"
        value={editor.humanHandoff.ownerSupportNote}
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            humanHandoff: { ...current.humanHandoff, ownerSupportNote: value },
          }))
        }
      />
    </EditorPanel>
  );
}

function PreviewFlowEditor({
  previewEn,
  previewAr,
}: {
  previewEn?: ReturnType<typeof createFlowPreview>;
  previewAr?: ReturnType<typeof createFlowPreview>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[previewEn, previewAr].filter(isFlowPreview).map((preview) => (
        <div
          key={preview.language}
          className="rounded-md border border-border bg-background p-4 text-sm"
        >
          <div className="font-medium">
            {preview.language === "ar" ? "Arabic" : "English"} draft preview
          </div>
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{preview.welcome}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {preview.buttons.map((button) => (
              <span key={button} className="rounded-md border border-border px-3 py-2">
                {button}
              </span>
            ))}
          </div>
          <p className="mt-4 whitespace-pre-wrap">{preview.storeInfo}</p>
          {preview.handoff ? <p className="mt-4 text-muted-foreground">{preview.handoff}</p> : null}
          {preview.customQuestions.length ? (
            <div className="mt-4 space-y-2">
              {preview.customQuestions.map((question) => (
                <div key={question.key} className="rounded-md border border-border p-2">
                  {question.label} {question.required ? "*" : ""}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function isFlowPreview(
  preview: ReturnType<typeof createFlowPreview> | undefined,
): preview is ReturnType<typeof createFlowPreview> {
  return Boolean(preview);
}

function FlowStepsOverview({ visualFlow }: { visualFlow: VisualFlowDefinition }) {
  const effectiveEdges = getEffectiveVisualEdges(visualFlow);
  const nodeById = new Map(visualFlow.nodes.map((node) => [node.id, node]));
  return (
    <EditorPanel>
      <div>
        <div className="font-medium">Conversation steps from visual builder</div>
        <p className="mt-1 text-sm text-muted-foreground">
          This reflects the full visual flow. The older tabs below only cover legacy settings like
          main menu, store info, checkout toggles, questions, and handoff.
        </p>
      </div>
      <div className="space-y-3">
        {visualFlow.nodes.map((node) => {
          const outgoing = effectiveEdges
            .filter((edge) => edge.sourceNodeId === node.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const options =
            node.config.menuOptions?.filter((option) => option.active !== false) ?? [];
          return (
            <div key={node.id} className="rounded-md border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{node.title || friendlyBlockName(node.type)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {friendlyBlockName(node.type)} · {node.type}
                  </div>
                </div>
                <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                  {visualBlockSummary(node)}
                </span>
              </div>
              {stepPrimaryText(node) ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {stepPrimaryText(node)}
                </p>
              ) : null}
              {options.length ? (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Options
                  </div>
                  {options.map((option, index) => (
                    <div
                      key={`${node.id}-${option.key ?? index}`}
                      className="grid gap-2 rounded-md border border-border p-2 text-sm md:grid-cols-[1fr_1fr]"
                    >
                      <div>
                        {option.label.en || option.key || `Option ${index + 1}`}
                        {option.label.ar ? (
                          <span className="block text-muted-foreground" dir="rtl">
                            {option.label.ar}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground">
                        Goes to: {stepTargetLabel(nodeById.get(option.targetNodeId ?? ""))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {outgoing.length ? (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Routes
                  </div>
                  {outgoing.map((edge) => (
                    <div
                      key={edge.id}
                      className="flex flex-wrap justify-between gap-2 rounded-md border border-border p-2 text-sm"
                    >
                      <span>{humanRouteLabel(edge.condition ?? edge.label)}</span>
                      <span className="text-muted-foreground">
                        {stepTargetLabel(nodeById.get(edge.targetNodeId))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No outgoing route configured.</p>
              )}
            </div>
          );
        })}
      </div>
    </EditorPanel>
  );
}

function ValidationPanel({
  validation,
}: {
  validation?: ReturnType<typeof validateFlowForEditor>;
}) {
  if (!validation) return null;
  return (
    <EditorPanel>
      <div className={validation.ok ? "font-medium text-primary" : "font-medium text-destructive"}>
        {validation.ok ? "Valid" : "Invalid"}
      </div>
      {validation.issues.length ? (
        <div className="space-y-2">
          {validation.issues.map((issue, index) => (
            <div
              key={`${issue.code}-${index}`}
              className="rounded-md border border-border p-3 text-sm"
            >
              <span className={issue.severity === "ERROR" ? "text-destructive" : "text-amber-200"}>
                {issue.severity}
              </span>{" "}
              {issue.message}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No validation issues.</p>
      )}
    </EditorPanel>
  );
}

function AdvancedJsonEditor({
  value,
  onChange,
  onSync,
}: {
  value: string;
  onChange: (value: string) => void;
  onSync: () => void;
}) {
  return (
    <EditorPanel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-amber-200">
          Advanced mode. Save or reload before switching between form edits and raw JSON edits.
        </p>
        <button type="button" className="studio-button-secondary" onClick={onSync}>
          Sync from form
        </button>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-h-[420px] w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-5"
      />
    </EditorPanel>
  );
}

function CopyPairFields({
  field,
  label,
  editor,
  onChange,
  multiline,
}: {
  field: keyof FlowEditorModel["copy"];
  label: string;
  editor: FlowEditorModel;
  onChange: (updater: (current: FlowEditorModel) => FlowEditorModel) => void;
  multiline?: boolean;
}) {
  const Field = multiline ? TextAreaField : TextField;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label={`${label} EN`}
        value={editor.copy[field].en}
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            copy: { ...current.copy, [field]: { ...current.copy[field], en: value } },
          }))
        }
      />
      <Field
        label={`${label} AR`}
        value={editor.copy[field].ar}
        dir="rtl"
        onChange={(value) =>
          onChange((current) => ({
            ...current,
            copy: { ...current.copy, [field]: { ...current.copy[field], ar: value } },
          }))
        }
      />
    </div>
  );
}

function EditorPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-md border border-border bg-background p-4">{children}</div>
  );
}

function TextField({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl";
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl";
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <textarea
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

async function saveAdvancedJsonDraft(businessId: string, parseAdvancedJson: () => FlowDefinition) {
  const flowJson = parseAdvancedJson();
  const validation = validateFlowForEditor(flowJson);
  if (!validation.ok) throw new Error("Advanced JSON has validation errors.");
  await applyAdminBusinessAction(businessId, {
    action: "save_business_flow_draft",
    flowJson,
  });
  const latest = await getBusinessFlowDetails(businessId);
  return latest.versions.find((entry) => entry.status === "DRAFT")?.id;
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function ConnectionForm({
  connection,
  saving,
  onSubmit,
}: {
  connection: AdminBusinessDetails["connections"][number] | undefined;
  saving: string;
  onSubmit: (connection: {
    connectionName?: string;
    businessAccountId?: string;
    phoneNumberId?: string;
    displayPhoneNumber?: string;
    appId?: string;
    status?: "DRAFT" | "ACTIVE" | "PAUSED" | "DISCONNECTED" | "ERROR";
    webhookPath?: string;
    accessTokenRef?: string;
    appSecretRef?: string;
    verifyTokenRef?: string;
    configSuffix?: string;
  }) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      connectionName: readOptional(form, "connectionName"),
      businessAccountId: readOptional(form, "businessAccountId"),
      phoneNumberId: readOptional(form, "phoneNumberId"),
      displayPhoneNumber: readOptional(form, "displayPhoneNumber"),
      appId: readOptional(form, "appId"),
      status: read(form, "connectionStatus") as
        | "DRAFT"
        | "ACTIVE"
        | "PAUSED"
        | "DISCONNECTED"
        | "ERROR",
      webhookPath: readOptional(form, "webhookPath"),
      accessTokenRef: readOptional(form, "accessTokenRef"),
      appSecretRef: readOptional(form, "appSecretRef"),
      verifyTokenRef: readOptional(form, "verifyTokenRef"),
      configSuffix: readOptional(form, "configSuffix"),
    });
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface/60 p-5">
      <h2 className="font-display text-xl font-semibold">WhatsApp connection</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Use secret reference names only. The admin panel does not store raw token values.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field name="connectionName" label="Name" defaultValue={connection?.display_name || ""} />
        <Field
          name="businessAccountId"
          label="Business account ID"
          defaultValue={connection?.business_account_id || ""}
        />
        <Field
          name="phoneNumberId"
          label="Phone number ID"
          defaultValue={connection?.phone_number_id || ""}
          required
        />
        <Field
          name="displayPhoneNumber"
          label="Display phone number"
          defaultValue={connection?.display_phone_number || ""}
        />
        <Field name="appId" label="Meta app ID" defaultValue={connection?.app_id || ""} />
        <Select
          name="connectionStatus"
          label="Status"
          values={["DRAFT", "ACTIVE", "PAUSED", "DISCONNECTED", "ERROR"]}
          defaultValue={connection?.status || "DRAFT"}
        />
        <Field
          name="webhookPath"
          label="Webhook path"
          defaultValue={connection?.webhook_path || "/api/whatsapp/webhook"}
        />
        <Field
          name="configSuffix"
          label="Legacy config suffix"
          defaultValue={connection?.config_suffix || ""}
        />
        <Field
          name="accessTokenRef"
          label="Access token reference"
          defaultValue={connection?.access_token_ref || ""}
        />
        <Field
          name="appSecretRef"
          label="App secret reference"
          defaultValue={connection?.app_secret_ref || ""}
        />
        <Field
          name="verifyTokenRef"
          label="Verify token reference"
          defaultValue={connection?.verify_token_ref || ""}
        />
      </div>
      <button
        type="submit"
        disabled={saving === "connection"}
        className="studio-button-primary mt-5"
      >
        {saving === "connection" ? "Saving..." : "Save connection"}
      </button>
    </form>
  );
}

function UserForm({
  users,
  saving,
  onSubmit,
}: {
  users: AdminBusinessDetails["users"];
  saving: string;
  onSubmit: (email: string, role: "OWNER" | "MANAGER" | "STAFF") => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit(read(form, "email"), read(form, "role") as "OWNER" | "MANAGER" | "STAFF");
    event.currentTarget.reset();
  }

  return (
    <section className="rounded-lg border border-border bg-surface/60 p-5">
      <h2 className="font-display text-xl font-semibold">Business users</h2>
      <div className="mt-4 space-y-3">
        {users.length ? (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-4 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
            >
              <div>
                <div className="font-medium">{user.email}</div>
                <div className="text-xs text-muted-foreground">{user.role}</div>
              </div>
              <span className="text-xs text-muted-foreground">{user.status}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No users assigned yet.</p>
        )}
      </div>
      <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-[1fr_150px_auto]">
        <input
          name="email"
          type="email"
          required
          placeholder="owner@example.com"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <select
          name="role"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="OWNER">OWNER</option>
          <option value="MANAGER">MANAGER</option>
          <option value="STAFF">STAFF</option>
        </select>
        <button type="submit" disabled={saving === "user"} className="studio-button-secondary">
          {saving === "user" ? "Adding..." : "Add user"}
        </button>
      </form>
    </section>
  );
}

function SeedDefaultsForm({
  saving,
  onSeed,
}: {
  saving: string;
  onSeed: (templateType: AdminBusinessTemplate) => void;
}) {
  const [templateType, setTemplateType] = useState<AdminBusinessTemplate>("ecommerce");
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row">
      <select
        value={templateType}
        onChange={(event) => setTemplateType(event.target.value as AdminBusinessTemplate)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {templates.map((template) => (
          <option key={template} value={template}>
            {templateLabels[template] ?? template.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={saving === "seed"}
        onClick={() => onSeed(templateType)}
        className="studio-button-secondary"
      >
        {saving === "seed" ? "Seeding..." : "Seed defaults"}
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-3 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function Select({
  name,
  label,
  values,
  defaultValue,
}: {
  name: string;
  label: string;
  values: readonly string[];
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <select
        name={name}
        defaultValue={defaultValue || values[0]}
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {templateLabels[value as AdminBusinessTemplate] ?? value.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function HealthPill({ status }: { status: "OK" | "WARNING" | "ERROR" }) {
  const Icon = status === "OK" ? CheckCircle2 : AlertTriangle;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-8 text-muted-foreground">
      {text}
    </div>
  );
}

function read(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

function readOptional(form: FormData, key: string) {
  return read(form, key) || undefined;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
