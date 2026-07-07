import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { applyAdminBusinessAction, getBusinessFlowDetails } from "@/lib/whatsapp/admin-client";
import {
  compileVisualFlowToRuntimeFlow,
  getVisualFlow,
  validateVisualFlow,
  type VisualFlowDefinition,
} from "@/lib/whatsapp/visual-flow-builder";
import type {
  BusinessFlowDetails,
  BusinessFlowVersionRow,
} from "@/lib/whatsapp/flow-template-store.server";
import { VisualFlowBuilderEditor } from "./admin.businesses.$businessId";

export const Route = createFileRoute("/admin/businesses/$businessId/flow-builder")({
  component: BusinessFlowBuilderPage,
});

function BusinessFlowBuilderPage() {
  const { businessId } = Route.useParams();
  const [details, setDetails] = useState<BusinessFlowDetails>();
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [visualFlow, setVisualFlow] = useState<VisualFlowDefinition>();
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [saving, setSaving] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    async (preferredVersionId?: string, label = "loading") => {
      setLoading(label);
      setError("");
      try {
        const nextDetails = await getBusinessFlowDetails(businessId);
        const selectedVersion = selectVersion(nextDetails, preferredVersionId || "");
        setDetails(nextDetails);
        setSelectedVersionId(selectedVersion?.id ?? "");
        setVisualFlow(selectedVersion ? getVisualFlow(selectedVersion.flow_json) : undefined);
        setSelectedBlockId("");
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
  const visualValidation = visualFlow ? validateVisualFlow(visualFlow) : undefined;
  const busy = Boolean(saving || loading);
  const compiled =
    !loading && selectedVersion && visualFlow
      ? compileVisualFlowToRuntimeFlow(visualFlow, selectedVersion.flow_json)
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

  async function saveDraft() {
    if (!compiled?.flow) throw new Error("Fix visual flow errors before saving.");
    await applyAdminBusinessAction(businessId, {
      action: "save_business_flow_draft",
      flowJson: compiled.flow,
    });
    const latest = await getBusinessFlowDetails(businessId);
    return latest.versions.find((version) => version.status === "DRAFT")?.id;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <a
            href={`/admin/businesses/${businessId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to business
          </a>
          <h1 className="mt-2 font-display text-2xl font-semibold">Flow builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure, build, test, and publish the WhatsApp customer journey for {businessId}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedVersionId}
            disabled={busy}
            onChange={(event) => {
              const nextVersionId = event.target.value;
              setSelectedVersionId(nextVersionId);
              void load(nextVersionId, "version");
            }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-60"
          >
            {details?.versions.map((version) => (
              <option key={version.id} value={version.id}>
                Version {version.version_number} - {version.status}
              </option>
            ))}
          </select>
          {loading ? (
            <span className="text-xs text-muted-foreground">
              {loading === "version" ? "Loading selected version..." : "Loading..."}
            </span>
          ) : null}
          <button
            type="button"
            disabled={busy}
            className="studio-button-secondary disabled:cursor-wait disabled:opacity-60"
            onClick={() => void load(selectedVersionId, "refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading === "refresh" ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            disabled={!compiled?.flow || busy}
            className="studio-button-secondary"
            onClick={() => void run("draft", saveDraft)}
          >
            {saving === "draft" ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            disabled={!compiled?.ok || busy}
            className="studio-button-primary"
            onClick={() =>
              void run("publish", async () => {
                const draftId = await saveDraft();
                if (!draftId) throw new Error("No draft version was available to publish.");
                await applyAdminBusinessAction(businessId, {
                  action: "publish_business_flow",
                  versionId: draftId,
                });
                return draftId;
              })
            }
          >
            {saving === "publish" ? "Publishing..." : "Publish"}
          </button>
        </div>
      </header>

      {error ? (
        <p className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!visualFlow ? (
        <div className="rounded-md border border-border bg-surface/60 p-6 text-sm text-muted-foreground">
          {loading
            ? "Loading flow..."
            : "No business flow exists yet. Go back to the business page and clone a published template first."}
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
            fullHeight
            visualFlow={visualFlow}
            selectedBlockId={selectedBlockId}
            validation={visualValidation}
            onSelectBlock={setSelectedBlockId}
            onChange={setVisualFlow}
          />
        </div>
      )}
    </div>
  );
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
