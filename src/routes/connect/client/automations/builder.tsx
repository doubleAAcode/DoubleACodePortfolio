import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Copy, RefreshCw, Rocket, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  applyWaDashboardFlowAction,
  getWaDashboardFlow,
  type WaDashboardFlowSnapshot,
} from "@/features/connect/shared/dashboard-client";
import {
  compileVisualFlowToRuntimeFlow,
  getVisualFlow,
  validateVisualFlow,
  type VisualFlowDefinition,
} from "@/features/connect/shared/visual-flow-builder";
import type {
  BotFlowSettingsInput,
  BusinessBotFlowSettings,
} from "@/features/connect/shared/bot-flow-settings.server";
import type {
  BusinessFlowDetails,
  BusinessFlowVersionRow,
} from "@/features/connect/shared/flow-template-store.server";
import { createDefaultFlowDefinition } from "@/features/connect/shared/flow-template-types";
import { VisualFlowBuilderEditor } from "@/routes/connect.admin.businesses.$businessId";

export const Route = createFileRoute("/connect/client/automations/builder")({
  component: ClientFlowBuilderPage,
});

function ClientFlowBuilderPage() {
  const [snapshot, setSnapshot] = useState<WaDashboardFlowSnapshot>();
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [visualFlow, setVisualFlow] = useState<VisualFlowDefinition>();
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [flowName, setFlowName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [botFlowSettings, setBotFlowSettings] = useState<BusinessBotFlowSettings>();
  const [confirmationEnglish, setConfirmationEnglish] = useState("");
  const [confirmationArabic, setConfirmationArabic] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const applySnapshot = useCallback((data: WaDashboardFlowSnapshot, preferredVersionId = "") => {
    const selected = selectVersion(data.details, preferredVersionId);
    setSnapshot(data);
    setSelectedVersionId(selected?.id ?? "");
    setVisualFlow(selected ? getVisualFlow(selected.flow_json) : undefined);
    setSelectedBlockId("");
    setFlowName(
      selected?.flow_json.name || data.details.flow?.name || "Custom WhatsApp conversation",
    );
    setTemplateId((current) =>
      data.templates.some((template) => template.id === current)
        ? current
        : data.templates[0]?.id || "",
    );
    setBotFlowSettings(data.catalog.botFlowSettings);
    setConfirmationEnglish(
      data.catalog.business.order_confirmation_message_english ||
        "Your order has been received and is waiting for confirmation.",
    );
    setConfirmationArabic(data.catalog.business.order_confirmation_message_arabic || "");
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
  const baseFlow = selectedVersion?.flow_json ?? createDefaultFlowDefinition("ECOMMERCE");
  const compiled = useMemo(
    () => (visualFlow ? compileVisualFlowToRuntimeFlow(visualFlow, baseFlow) : undefined),
    [baseFlow, visualFlow],
  );
  const validation = visualFlow ? validateVisualFlow(visualFlow) : undefined;
  const liveVersion = snapshot?.details.activeVersion;
  const draftVersion = snapshot?.details.versions.find((version) => version.status === "DRAFT");

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
    if (!visualFlow) throw new Error("No flow is loaded.");
    if (!compiled?.ok || !compiled.flow) {
      throw new Error(validationMessage(compiled?.validation?.issues ?? validation?.issues ?? []));
    }
    const cleanName = flowName.trim() || "Custom WhatsApp conversation";
    const namedVisualFlow = {
      ...visualFlow,
      metadata: { ...visualFlow.metadata, name: cleanName },
    };
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

  async function saveCheckoutSettings() {
    if (!botFlowSettings) throw new Error("Checkout settings are not loaded.");
    const data = await applyWaDashboardFlowAction({
      action: "save_checkout_settings",
      botFlowSettings: toBotFlowSettingsInput(botFlowSettings),
      orderConfirmationMessageEnglish: confirmationEnglish,
      orderConfirmationMessageArabic: confirmationArabic,
    });
    const currentVersionId = selectedVersionId;
    applySnapshot(data, currentVersionId);
  }

  function chooseVersion(versionId: string) {
    if (!snapshot) return;
    const selected = selectVersion(snapshot.details, versionId);
    setSelectedVersionId(selected?.id ?? "");
    setVisualFlow(selected ? getVisualFlow(selected.flow_json) : undefined);
    setSelectedBlockId("");
    setFlowName(
      selected?.flow_json.name || snapshot.details.flow?.name || "Custom WhatsApp conversation",
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <header className="shrink-0 border-b border-border pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <a
              href="/connect/client/automations"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Automations
            </a>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold">Flow builder</h1>
              <span className="text-sm text-muted-foreground">
                {snapshot?.catalog.business.name}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {liveVersion ? (
              <VersionBadge label={`Live v${liveVersion.version_number}`} live />
            ) : (
              <VersionBadge label="No live version" />
            )}
            {draftVersion ? (
              <VersionBadge label={`Draft v${draftVersion.version_number}`} draft />
            ) : null}
            <select
              value={selectedVersionId}
              disabled={Boolean(busy)}
              onChange={(event) => chooseVersion(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
            >
              {snapshot?.details.versions.map((version) => (
                <option key={version.id} value={version.id}>
                  Version {version.version_number} - {version.status}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="studio-button-secondary h-9"
              disabled={Boolean(busy) || !visualFlow}
              onClick={() =>
                void run("save", async () => {
                  await saveDraft();
                })
              }
            >
              <Save className="size-4" />
              {busy === "save" ? "Saving..." : "Save draft"}
            </button>
            <button
              type="button"
              className="studio-button-primary h-9"
              disabled={Boolean(busy) || !visualFlow}
              onClick={() => void run("publish", publish)}
            >
              <Rocket className="size-4" />
              {busy === "publish" ? "Publishing..." : "Publish"}
            </button>
            <button
              type="button"
              className="studio-button-secondary h-9 px-3"
              disabled={Boolean(busy)}
              onClick={() => void load()}
              title="Refresh flow"
            >
              <RefreshCw className={`size-4 ${busy === "load" ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh flow</span>
            </button>
          </div>
        </div>
        {visualFlow ? (
          <label className="mt-2 flex max-w-xl items-center gap-2 text-xs text-muted-foreground">
            Flow name
            <input
              value={flowName}
              onChange={(event) => setFlowName(event.target.value)}
              className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
          </label>
        ) : null}
      </header>

      {error ? (
        <div className="shrink-0 border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {validation?.issues.length ? (
        <details className="shrink-0 border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
          <summary className="cursor-pointer font-medium text-amber-100">
            {validation.issues.length} validation issue(s)
          </summary>
          <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
            {validation.issues.slice(0, 6).map((issue, index) => (
              <li key={`${issue.code}-${index}`}>
                {index + 1}. {issue.message}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {!snapshot || busy === "load" ? (
        <div className="grid min-h-0 flex-1 place-items-center text-sm text-muted-foreground">
          <RefreshCw className="mr-2 inline size-4 animate-spin" />
          Loading flow...
        </div>
      ) : !visualFlow ? (
        <section className="max-w-3xl border border-border bg-surface/45 p-6">
          <h2 className="font-display text-xl font-semibold">Start from an approved template</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The template becomes an editable draft for this business. Publishing still runs the full
            protected validation pipeline.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {snapshot.templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="studio-button-primary"
              disabled={!templateId || Boolean(busy)}
              onClick={() => void run("clone", cloneTemplate)}
            >
              <Copy className="size-4" />
              {busy === "clone" ? "Creating..." : "Use template"}
            </button>
          </div>
        </section>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <VisualFlowBuilderEditor
            businessId={snapshot.catalog.business.id}
            fullHeight
            visualFlow={visualFlow}
            selectedBlockId={selectedBlockId}
            validation={validation}
            botFlowSettings={botFlowSettings}
            catalogGroups={snapshot.catalog.catalogGroups}
            catalogGroupValues={snapshot.catalog.catalogGroupValues}
            checkoutSaving={busy === "checkout"}
            orderConfirmationEnglish={confirmationEnglish}
            orderConfirmationArabic={confirmationArabic}
            onSelectBlock={setSelectedBlockId}
            onChange={setVisualFlow}
            onBotFlowSettingsChange={setBotFlowSettings}
            onOrderConfirmationEnglishChange={setConfirmationEnglish}
            onOrderConfirmationArabicChange={setConfirmationArabic}
            onSaveCheckoutSettings={() => void run("checkout", saveCheckoutSettings)}
          />
        </div>
      )}
    </div>
  );
}

function VersionBadge({
  label,
  live = false,
  draft = false,
}: {
  label: string;
  live?: boolean;
  draft?: boolean;
}) {
  return (
    <span
      className={`rounded-md border px-2.5 py-1 text-xs ${live ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300" : draft ? "border-amber-500/35 bg-amber-500/10 text-amber-200" : "border-border text-muted-foreground"}`}
    >
      {label}
    </span>
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

function toBotFlowSettingsInput(settings: BusinessBotFlowSettings): BotFlowSettingsInput {
  const { businessId: _businessId, updatedAt: _updatedAt, ...input } = settings;
  return input;
}

function validationMessage(issues: Array<{ message: string }>) {
  if (!issues.length) return "The flow could not be compiled.";
  return `Fix these flow errors before saving:\n${issues
    .slice(0, 8)
    .map((issue, index) => `${index + 1}. ${issue.message}`)
    .join("\n")}`;
}
