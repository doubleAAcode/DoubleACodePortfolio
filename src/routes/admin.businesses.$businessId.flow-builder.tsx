import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  applyAdminBusinessAction,
  getAdminBusinessDetails,
  getBusinessFlowDetails,
  getFlowTemplates,
} from "@/lib/whatsapp/admin-client";
import {
  compileVisualFlowToRuntimeFlow,
  getVisualFlow,
  validateVisualFlow,
  type VisualFlowDefinition,
} from "@/lib/whatsapp/visual-flow-builder";
import type { AdminBusinessDetails } from "@/lib/whatsapp/admin-store.server";
import type {
  BusinessFlowDetails,
  FlowTemplateRow,
  BusinessFlowVersionRow,
} from "@/lib/whatsapp/flow-template-store.server";
import { createDefaultFlowDefinition } from "@/lib/whatsapp/flow-template-types";
import type { BotFlowSettingsInput, BusinessBotFlowSettings } from "@/lib/whatsapp/bot-flow-settings.server";
import { VisualFlowBuilderEditor } from "./admin.businesses.$businessId";

export const Route = createFileRoute("/admin/businesses/$businessId/flow-builder")({
  component: BusinessFlowBuilderPage,
});

const approvedTemplateCategories = new Set([
  "ECOMMERCE",
  "RESTAURANT",
  "GREETING_STORE_INFO",
]);

const supportedTemplateFamilies = [
  "Greeting + Store Info / Price Lists",
  "E-commerce",
  "Restaurant",
];

const supportedNormalActions = [
  "Text",
  "Image / price list",
  "Options, max 3",
  "Return to menu",
  "Catalog browse",
  "Product purchase",
  "Talk to human",
  "End",
];

function BusinessFlowBuilderPage() {
  const { businessId } = Route.useParams();
  const [details, setDetails] = useState<BusinessFlowDetails>();
  const [adminDetails, setAdminDetails] = useState<AdminBusinessDetails>();
  const [botFlowSettings, setBotFlowSettings] = useState<BusinessBotFlowSettings>();
  const [orderConfirmationEnglish, setOrderConfirmationEnglish] = useState("");
  const [orderConfirmationArabic, setOrderConfirmationArabic] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [visualFlow, setVisualFlow] = useState<VisualFlowDefinition>();
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [templates, setTemplates] = useState<FlowTemplateRow[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [nameDialogAction, setNameDialogAction] = useState<"draft" | "publish" | "">("");
  const [flowNameInput, setFlowNameInput] = useState("");

  const load = useCallback(
    async (preferredVersionId?: string, label = "loading") => {
      setLoading(label);
      setError("");
      try {
        const [nextDetails, nextAdminDetails, templateRows] = await Promise.all([
          getBusinessFlowDetails(businessId),
          getAdminBusinessDetails(businessId),
          getFlowTemplates(),
        ]);
        const publishedTemplates = templateRows.filter(
          (template) =>
            template.status === "PUBLISHED" && approvedTemplateCategories.has(template.category),
        );
        setTemplates(publishedTemplates);
        setTemplateId((current) =>
          publishedTemplates.some((template) => template.id === current)
            ? current
            : publishedTemplates[0]?.id || "",
        );
        const selectedVersion = selectVersion(nextDetails, preferredVersionId || "");
        setDetails(nextDetails);
        setAdminDetails(nextAdminDetails);
        setBotFlowSettings(nextAdminDetails.botFlowSettings);
        setOrderConfirmationEnglish(
          nextAdminDetails.business.order_confirmation_message_english ||
            "Your order has been received and is waiting for confirmation.",
        );
        setOrderConfirmationArabic(nextAdminDetails.business.order_confirmation_message_arabic || "");
        setSelectedVersionId(selectedVersion?.id ?? "");
        setVisualFlow(selectedVersion ? getVisualFlow(selectedVersion.flow_json) : undefined);
        setSelectedBlockId("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load flow builder data.");
      } finally {
        setLoading("");
      }
    },
    [businessId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectedVersion = details ? selectVersion(details, selectedVersionId) : undefined;
  const liveVersion = details?.activeVersion;
  const draftVersion = details?.versions.find((version) => version.status === "DRAFT");
  const selectedTemplate = templates.find((template) => template.id === templateId);
  const visualValidation = visualFlow ? validateVisualFlow(visualFlow) : undefined;
  const busy = Boolean(saving || loading);
  const baseFlowForCompile =
    selectedVersion?.flow_json ?? createDefaultFlowDefinition("ECOMMERCE");
  const compiled =
    !loading && visualFlow
      ? compileVisualFlowToRuntimeFlow(visualFlow, baseFlowForCompile)
      : undefined;

  async function run(label: string, action: () => Promise<string | undefined>) {
    setSaving(label);
    setError("");
    try {
      await load(await action(), "loading");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flow builder action failed.");
    } finally {
      setSaving("");
    }
  }

  function flowActionError(actionLabel: string) {
    if (!visualFlow) return `${actionLabel} cannot continue because no flow is loaded.`;
    if (!compiled?.ok || !compiled.flow) {
      const issues = (compiled?.validation ?? visualValidation)?.issues ?? [];
      const issueList = issues.length
        ? `\n\n${issues
            .map((issue, index) => `${index + 1}. ${humanizeValidationIssue(issue.message)}`)
            .join("\n")}`
        : "";
      return `${actionLabel} cannot continue. Fix these flow errors first:${issueList}`;
    }
    return "";
  }

  function openNameDialog(action: "draft" | "publish") {
    const currentName =
      visualFlow?.metadata.name ||
      details?.flow?.name ||
      selectedVersion?.flow_json.name ||
      "Custom WhatsApp conversation";
    setFlowNameInput(currentName);
    setNameDialogAction(action);
  }

  async function saveDraft(flowName: string) {
    if (!visualFlow) throw new Error("Save draft cannot continue because no flow is loaded.");
    const cleanName = flowName.trim() || "Custom WhatsApp conversation";
    const namedVisualFlow = visualFlow
      ? { ...visualFlow, metadata: { ...visualFlow.metadata, name: cleanName } }
      : undefined;
    const flow =
      compiled?.flow ??
      ({
        ...baseFlowForCompile,
        name: cleanName,
        startNodeId:
          namedVisualFlow?.nodes.find((node) => node.type === "START")?.id ??
          namedVisualFlow?.nodes[0]?.id ??
          baseFlowForCompile.startNodeId,
        visualFlow: namedVisualFlow,
      } as typeof baseFlowForCompile);
    await applyAdminBusinessAction(businessId, {
      action: "save_business_flow_draft",
      flowName: cleanName,
      flowJson: {
        ...flow,
        name: cleanName,
        visualFlow: namedVisualFlow ?? flow.visualFlow,
      },
    });
    if (namedVisualFlow) setVisualFlow(namedVisualFlow);
    const latest = await getBusinessFlowDetails(businessId);
    return latest.versions.find((version) => version.status === "DRAFT")?.id;
  }

  async function cloneSelectedTemplate() {
    if (!templateId) throw new Error("Choose a published template first.");
    await applyAdminBusinessAction(businessId, {
      action: "clone_flow_template",
      templateId,
    });
    const latest = await getBusinessFlowDetails(businessId);
    return latest.versions.find((version) => version.status === "DRAFT")?.id ?? selectVersion(latest, "")?.id;
  }

  async function saveCheckoutSettings() {
    if (!botFlowSettings) throw new Error("Checkout settings are not loaded yet.");
    const nextDetails = await applyAdminBusinessAction(businessId, {
      action: "save_checkout_settings",
      settings: {
        botFlowSettings: toBotFlowSettingsInput(botFlowSettings),
        orderConfirmationMessageEnglish: orderConfirmationEnglish,
        orderConfirmationMessageArabic: orderConfirmationArabic,
      },
    });
    setBotFlowSettings(nextDetails.botFlowSettings);
    setOrderConfirmationEnglish(
      nextDetails.business.order_confirmation_message_english ||
        "Your order has been received and is waiting for confirmation.",
    );
    setOrderConfirmationArabic(nextDetails.business.order_confirmation_message_arabic || "");
  }

  async function confirmNamedAction() {
    const action = nameDialogAction;
    if (!action) return;
    const cleanName = flowNameInput.trim();
    if (!cleanName) {
      setError("Enter a template name before saving.");
      return;
    }
    setNameDialogAction("");
    await run(action, async () => {
      const draftId = await saveDraft(cleanName);
      if (action === "publish") {
        if (!draftId) throw new Error("No draft version was available to publish.");
        await applyAdminBusinessAction(businessId, {
          action: "publish_business_flow",
          versionId: draftId,
        });
      }
      return draftId;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <header className="shrink-0 border-b border-border pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/admin/businesses/${businessId}`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Business
              </a>
              <span className="text-muted-foreground">/</span>
              <h1 className="font-display text-xl font-semibold">Flow builder</h1>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                - {adminDetails?.business.name || businessId}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {liveVersion ? (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                Live v{liveVersion.version_number}
              </span>
            ) : (
              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                No live version
              </span>
            )}
            {draftVersion ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-100">
                Draft v{draftVersion.version_number}
              </span>
            ) : null}
            <select
              value={selectedVersionId}
              disabled={busy}
              onChange={(event) => {
                const nextVersionId = event.target.value;
                setSelectedVersionId(nextVersionId);
                void load(nextVersionId, "version");
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:cursor-wait disabled:opacity-60"
            >
              {!selectedVersionId && visualFlow ? <option value="">Unsaved template flow</option> : null}
              {details?.versions.map((version) => (
                <option key={version.id} value={version.id}>
                  Version {version.version_number} - {version.status}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              className="studio-button-secondary h-9 disabled:cursor-wait disabled:opacity-60"
              onClick={() => openNameDialog("draft")}
            >
              {saving === "draft" ? "Saving..." : "Save draft"}
            </button>
            <button
              type="button"
              disabled={busy}
              className="studio-button-primary h-9 disabled:cursor-wait disabled:opacity-60"
              onClick={() => openNameDialog("publish")}
            >
              {saving === "publish" ? "Publishing..." : "Publish changes"}
            </button>
            <FlowBuilderMoreMenu
              templates={templates}
              templateId={templateId}
              busy={busy}
              saving={saving}
              loading={loading}
              onTemplateIdChange={setTemplateId}
              onCloneTemplate={() => void run("template", cloneSelectedTemplate)}
              onRefresh={() => void load(selectedVersionId, "refresh")}
            />
          </div>
        </div>
        <div className="mt-2 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {flowEditingTitle(selectedVersion, liveVersion ?? undefined, !selectedVersionId && Boolean(visualFlow))}
          </span>
          <span>{flowEditingBase(selectedVersion, liveVersion ?? undefined, !selectedVersionId && Boolean(visualFlow))}</span>
          <span>
            {liveVersion
              ? `Customers use v${liveVersion.version_number}.`
              : "No customer-facing version is live."}
          </span>
          {loading ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              {loading === "version" ? "Loading selected version..." : "Loading..."}
            </span>
          ) : null}
        </div>
      </header>

      {error ? <FlowBuilderErrorBanner message={error} /> : null}
      {visualFlow && visualValidation?.issues.length ? (
        <FlowValidationSummary
          validation={visualValidation}
          visualFlow={visualFlow}
          onSelectBlock={setSelectedBlockId}
        />
      ) : null}
      <TemplateCapabilityStrip selectedTemplate={selectedTemplate} />

      {!visualFlow ? (
        <div className="rounded-md border border-border bg-surface/60 p-6 text-sm">
          {loading ? (
            <p className="text-muted-foreground">Loading flow...</p>
          ) : (
            <div className="max-w-3xl">
              <h2 className="font-display text-xl font-semibold">Start this WhatsApp flow</h2>
              <p className="mt-2 text-muted-foreground">
                Choose one of the supported admin templates, then deeply edit the conversation map
                for this business.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                  disabled={!templates.length || busy}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
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
                  disabled={!templateId || busy}
                  className="studio-button-secondary"
                  onClick={() => void run("template", cloneSelectedTemplate)}
                >
                  {saving === "template" ? "Creating..." : "Start from template"}
                </button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Templates created by admins remain reusable and can be assigned to different
                businesses from this setup step.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-background/70 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted-foreground shadow-lg">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                {loading === "version" ? "Loading selected version..." : "Loading flow..."}
              </div>
            </div>
          ) : null}
          <VisualFlowBuilderEditor
            businessId={businessId}
            fullHeight
            visualFlow={visualFlow}
            selectedBlockId={selectedBlockId}
            validation={visualValidation}
            botFlowSettings={botFlowSettings}
            catalogGroups={adminDetails?.catalogGroups ?? []}
            catalogGroupValues={adminDetails?.catalogGroupValues ?? []}
            checkoutSaving={saving === "checkout"}
            orderConfirmationEnglish={orderConfirmationEnglish}
            orderConfirmationArabic={orderConfirmationArabic}
            onSelectBlock={setSelectedBlockId}
            onChange={setVisualFlow}
            onBotFlowSettingsChange={setBotFlowSettings}
            onOrderConfirmationEnglishChange={setOrderConfirmationEnglish}
            onOrderConfirmationArabicChange={setOrderConfirmationArabic}
            onSaveCheckoutSettings={() => void run("checkout", async () => {
              await saveCheckoutSettings();
              return selectedVersionId;
            })}
          />
        </div>
      )}
      {nameDialogAction ? (
        <FlowNameDialog
          action={nameDialogAction}
          value={flowNameInput}
          busy={busy}
          onChange={setFlowNameInput}
          onCancel={() => setNameDialogAction("")}
          onConfirm={() => void confirmNamedAction()}
        />
      ) : null}
    </div>
  );
}

function TemplateCapabilityStrip({ selectedTemplate }: { selectedTemplate?: FlowTemplateRow }) {
  return (
    <div className="shrink-0 rounded-md border border-border bg-surface/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-medium text-foreground">Normal builder:</span>
        <span>
          template-based editing for {supportedTemplateFamilies.join(", ")}
          {selectedTemplate ? `; selected template: ${selectedTemplate.name}` : ""}.
        </span>
        <span className="hidden text-muted-foreground/70 md:inline">Supported actions:</span>
        <div className="flex flex-wrap gap-1.5">
          {supportedNormalActions.map((action) => (
            <span
              key={action}
              className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {action}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowNameDialog({
  action,
  value,
  busy,
  onChange,
  onCancel,
  onConfirm,
}: {
  action: "draft" | "publish";
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-2xl">
        <h2 className="font-display text-xl font-semibold">Name this flow template</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This name will identify the saved WhatsApp flow for this business.
        </p>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-muted-foreground">Template name</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoFocus
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="studio-button-secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="studio-button-primary" disabled={busy} onClick={onConfirm}>
            {action === "publish" ? "Save and publish" : "Save draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FlowBuilderMoreMenu({
  templates,
  templateId,
  busy,
  saving,
  loading,
  onTemplateIdChange,
  onCloneTemplate,
  onRefresh,
}: {
  templates: FlowTemplateRow[];
  templateId: string;
  busy: boolean;
  saving: string;
  loading: string;
  onTemplateIdChange: (value: string) => void;
  onCloneTemplate: () => void;
  onRefresh: () => void;
}) {
  return (
    <details className="relative">
      <summary className="studio-button-secondary h-9 cursor-pointer list-none">
        More
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-[min(420px,calc(100vw-2rem))] rounded-md border border-border bg-background p-3 shadow-2xl">
        <div className="grid gap-2">
          <button
            type="button"
            disabled={busy}
            className="studio-button-secondary justify-center disabled:cursor-wait disabled:opacity-60"
            onClick={onRefresh}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading === "refresh" ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-3 rounded-md border border-border bg-surface/40 p-3">
          <div className="text-sm font-medium">Clone a flow template</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Start from a reusable admin template, then save it as this business draft.
          </p>
          <select
            value={templateId}
            onChange={(event) => onTemplateIdChange(event.target.value)}
            disabled={!templates.length || busy}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
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
            disabled={!templateId || busy}
            className="studio-button-primary mt-3 w-full justify-center disabled:cursor-wait disabled:opacity-60"
            onClick={onCloneTemplate}
          >
            {saving === "template" ? "Cloning..." : "Clone selected template"}
          </button>
        </div>
      </div>
    </details>
  );
}

function FlowBuilderErrorBanner({ message }: { message: string }) {
  const lines = message.split("\n").filter((line) => line.trim());
  const title = lines[0] ?? message;
  const items = lines.slice(1);
  return (
    <div className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      <div className="font-medium">{title}</div>
      {items.length ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {items.map((line, index) => (
            <li key={`${line}-${index}`}>{line.replace(/^\d+\.\s*/, "")}</li>
          ))}
        </ol>
      ) : null}
      <p className="mt-2 text-xs text-destructive/80">
        Open the Test tab for the full validation list, or click the affected step in the map.
      </p>
    </div>
  );
}

function FlowValidationSummary({
  validation,
  visualFlow,
  onSelectBlock,
}: {
  validation: ReturnType<typeof validateVisualFlow>;
  visualFlow: VisualFlowDefinition;
  onSelectBlock: (blockId: string) => void;
}) {
  if (!validation.issues.length) return null;
  const errors = validation.issues.filter((issue) => issue.severity === "ERROR");
  const warnings = validation.issues.filter((issue) => issue.severity !== "ERROR");
  return (
    <details className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-amber-100">
        Flow diagnostics: {errors.length} error{errors.length === 1 ? "" : "s"}
        {warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : ""}
      </summary>
      <div className="mt-3 grid gap-2 xl:grid-cols-2">
        {validation.issues.slice(0, 6).map((issue, index) => {
          const target = nodeForBuilderIssue(visualFlow, issue.message);
          return (
            <div
              key={`${issue.code}-${index}`}
              className="rounded-md border border-border/80 bg-background/70 p-3"
            >
              <div
                className={
                  issue.severity === "ERROR"
                    ? "text-xs font-semibold text-destructive"
                    : "text-xs font-semibold text-amber-200"
                }
              >
                {issue.severity}
              </div>
              <div className="mt-1 text-muted-foreground">
                {humanizeValidationIssue(issue.message)}
              </div>
              {issue.suggestedFix ? (
                <div className="mt-2 rounded-md border border-border/70 bg-surface/40 px-3 py-2 text-xs text-muted-foreground">
                  Fix: {issue.suggestedFix}
                </div>
              ) : null}
              {target ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => onSelectBlock(target.id)}
                >
                  Focus {target.title || friendlyBlockNameForRoute(target.type)}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {validation.issues.length > 6 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing the first 6 diagnostics. Open the Test tab for the full list.
        </p>
      ) : null}
    </details>
  );
}

function flowEditingTitle(
  selectedVersion: BusinessFlowVersionRow | undefined,
  liveVersion: BusinessFlowVersionRow | undefined,
  hasScratchFlow: boolean,
) {
  if (hasScratchFlow) return "Editing unsaved template flow";
  if (!selectedVersion) return "No flow loaded";
  if (selectedVersion.status === "DRAFT") return `Editing Draft ${selectedVersion.version_number}`;
  if (liveVersion?.id === selectedVersion.id) {
    return `Editing a copy of Live Version ${selectedVersion.version_number}`;
  }
  if (selectedVersion.status === "PUBLISHED") {
    return `Editing a copy of Published Version ${selectedVersion.version_number}`;
  }
  return `Viewing Version ${selectedVersion.version_number}`;
}

function flowEditingBase(
  selectedVersion: BusinessFlowVersionRow | undefined,
  liveVersion: BusinessFlowVersionRow | undefined,
  hasScratchFlow: boolean,
) {
  if (hasScratchFlow) return "Template copy, not saved yet.";
  if (!selectedVersion) return "Select a version or start from a template.";
  if (selectedVersion.status === "DRAFT" && liveVersion) {
    return `Based on Live Version ${liveVersion.version_number}.`;
  }
  if (selectedVersion.status === "DRAFT") return "Editing the saved draft.";
  if (liveVersion?.id === selectedVersion.id) return "Saving creates or updates a draft.";
  if (selectedVersion.status === "PUBLISHED") {
    return "Historical published version. Saving creates or updates a draft.";
  }
  return "Loaded from saved flow data.";
}

function toBotFlowSettingsInput(settings: BusinessBotFlowSettings): BotFlowSettingsInput {
  const { businessId: _businessId, updatedAt: _updatedAt, ...input } = settings;
  return input;
}

function selectVersion(
  details: BusinessFlowDetails,
  versionId: string,
): BusinessFlowVersionRow | undefined {
  return (
    details.versions.find((version) => version.id === versionId) ??
    details.activeVersion ??
    details.versions[0]
  );
}

function humanizeValidationIssue(message: string) {
  if (message.includes("Human handoff") && message.includes("not reachable")) {
    return "The Talk to human step exists, but no menu option leads to it. Add a Talk to human option in Main Menu or another options step.";
  }
  if (message.includes("not reachable from START")) {
    return `${message.replace("START", "Entry point")} Connect this step from the conversation map or choose it as a target in an options list.`;
  }
  if (message.includes("has no outgoing connection")) {
    return `${message} Choose what happens after this step in the settings panel.`;
  }
  return message
    .replaceAll("START", "Entry point")
    .replaceAll("MAIN_MENU", "Main menu")
    .replaceAll("HUMAN_HANDOFF", "Talk to human");
}

function nodeForBuilderIssue(visualFlow: VisualFlowDefinition, message: string) {
  const lowerMessage = message.toLowerCase();
  return visualFlow.nodes.find((node) => {
    const labels = [
      node.id,
      node.title,
      node.type,
      friendlyBlockNameForRoute(node.type),
      node.type === "START" ? "Entry point" : "",
      node.type === "HUMAN_HANDOFF" ? "Talk to human" : "",
    ].filter(Boolean);
    return labels.some((label) => lowerMessage.includes(label.toLowerCase()));
  });
}

function friendlyBlockNameForRoute(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
