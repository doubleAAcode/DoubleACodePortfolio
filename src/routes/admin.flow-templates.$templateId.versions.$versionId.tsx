import { createFileRoute } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { applyFlowTemplateAction, getFlowTemplateDetails } from "@/lib/whatsapp/admin-client";
import type { FlowTemplateDetails } from "@/lib/whatsapp/flow-template-store.server";

export const Route = createFileRoute("/admin/flow-templates/$templateId/versions/$versionId")({
  component: FlowTemplateVersionPage,
});

function FlowTemplateVersionPage() {
  const { templateId, versionId } = Route.useParams();
  const [details, setDetails] = useState<FlowTemplateDetails>();
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  const version = useMemo(
    () => details?.versions.find((entry) => entry.id === versionId),
    [details, versionId],
  );

  useEffect(() => {
    getFlowTemplateDetails(templateId)
      .then((data) => {
        setDetails(data);
        const selected = data.versions.find((entry) => entry.id === versionId);
        setJson(JSON.stringify(selected?.flow_json ?? {}, null, 2));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load version."));
  }, [templateId, versionId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving("save");
    setError("");
    try {
      const data = await applyFlowTemplateAction(templateId, {
        action: "save_draft",
        flowJson: JSON.parse(json),
      });
      setDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft.");
    } finally {
      setSaving("");
    }
  }

  async function publish() {
    setSaving("publish");
    setError("");
    try {
      setDetails(
        await applyFlowTemplateAction(templateId, {
          action: "publish_version",
          versionId,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish version.");
    } finally {
      setSaving("");
    }
  }

  if (error && !details) return <PageState text={error} />;
  if (!details || !version) return <PageState text="Loading version..." />;

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <a
            href={`/admin/flow-templates/${templateId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to template
          </a>
          <p className="mt-5 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Flow version
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Version {version.version_number}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{version.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving === "save"} className="studio-button-secondary">
            {saving === "save" ? "Saving..." : "Save as draft"}
          </button>
          <button
            type="button"
            disabled={saving === "publish"}
            onClick={() => void publish()}
            className="studio-button-primary"
          >
            {saving === "publish" ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-display text-xl font-semibold">Validation</h2>
        <div className="mt-4 space-y-2 text-sm">
          {version.validation_result.issues.length ? (
            version.validation_result.issues.map((issue) => (
              <div
                key={`${issue.code}-${issue.message}`}
                className="rounded-md border border-border p-3"
              >
                <span
                  className={issue.severity === "ERROR" ? "text-destructive" : "text-amber-200"}
                >
                  {issue.severity}
                </span>{" "}
                {issue.message}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No validation issues.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-display text-xl font-semibold">Flow JSON</h2>
        <textarea
          value={json}
          onChange={(event) => setJson(event.target.value)}
          spellCheck={false}
          className="mt-4 min-h-[620px] w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-5"
        />
      </section>
    </form>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-8 text-muted-foreground">
      {text}
    </div>
  );
}
