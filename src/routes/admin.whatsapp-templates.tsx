import { createFileRoute } from "@tanstack/react-router";
import { FileText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import {
  createWhatsAppTemplateSubmission,
  getReviewConnections,
  getWhatsAppTemplateSubmissions,
} from "@/lib/whatsapp/admin-client";
import type { ReviewConnectionSummary } from "@/lib/whatsapp/app-review-demo.server";

export const Route = createFileRoute("/admin/whatsapp-templates")({
  component: WhatsAppTemplatesPage,
});

type TemplateResult = Awaited<ReturnType<typeof createWhatsAppTemplateSubmission>>;
type TemplateRows = Awaited<ReturnType<typeof getWhatsAppTemplateSubmissions>>["local"];

function WhatsAppTemplatesPage() {
  const [connections, setConnections] = useState<ReviewConnectionSummary[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [templates, setTemplates] = useState<TemplateRows>([]);
  const [metaList, setMetaList] = useState<unknown>();
  const [name, setName] = useState(() => defaultTemplateName());
  const [language, setLanguage] = useState("en_US");
  const [category, setCategory] = useState("UTILITY");
  const [body, setBody] = useState(
    "Hello {{1}}, your order update from our demo platform is ready.",
  );
  const [result, setResult] = useState<TemplateResult>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => connections.find((connection) => connection.connectionId === connectionId),
    [connectionId, connections],
  );

  const refresh = useCallback(
    async (includeMeta = false) => {
      if (!connectionId) return;
      const data = await getWhatsAppTemplateSubmissions({ connectionId, includeMeta });
      setTemplates(data.local);
      if (includeMeta) setMetaList(data.meta);
    },
    [connectionId],
  );

  useEffect(() => {
    setLoading(true);
    getReviewConnections()
      .then((rows) => {
        setConnections(rows);
        setConnectionId(rows[0]?.connectionId || "");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load WhatsApp connections."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void refresh(false).catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load template submissions."),
    );
  }, [refresh]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    setResult(undefined);
    try {
      const created = await createWhatsAppTemplateSubmission({
        connectionId: selected.connectionId,
        name,
        language,
        category,
        body,
      });
      setResult(created);
      setName(defaultTemplateName());
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create WhatsApp template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Meta App Review Demo
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            WhatsApp Templates
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Use this internal page to demonstrate creating and managing WhatsApp message templates
            through our SaaS. This internal demo is part of the WhatsApp commerce platform operated
            by THE COATING GUYS PTY. LTD. ABN: 40 696 839 899.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh(true)}
          disabled={!selected}
          className="studio-button-secondary"
        >
          <RefreshCw className="h-4 w-4" />
          Fetch from Meta
        </button>
      </header>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? <Alert>Loading WhatsApp connections...</Alert> : null}

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <Panel title="Connection">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Business / WABA connection</span>
            <select
              value={connectionId}
              onChange={(event) => setConnectionId(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              {connections.map((connection) => (
                <option key={connection.connectionId} value={connection.connectionId}>
                  {connection.businessName} - {connection.connectionName}
                </option>
              ))}
            </select>
          </label>
          {selected ? (
            <div className="mt-4 grid gap-3 text-sm">
              <Info label="Business" value={selected.businessName} />
              <Info label="Connection" value={selected.connectionName} />
              <Info label="WABA ID" value={selected.businessAccountId || "Not set"} />
              <Info label="Phone number ID" value={selected.phoneNumberId} />
              <Info
                label="Status"
                value={`${selected.status} / ${selected.isActive ? "active" : "inactive"}`}
              />
              <Info
                label="Required env/secrets"
                value={
                  selected.missingConfigKeys.length
                    ? `Missing: ${selected.missingConfigKeys.join(", ")}`
                    : "Configured"
                }
                warning={Boolean(selected.missingConfigKeys.length)}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No WhatsApp connections found.</p>
          )}
        </Panel>

        <Panel title="Create template in Meta">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Template name" value={name} onChange={setName} />
              <Field label="Language" value={language} onChange={setLanguage} />
              <Field label="Category" value={category} onChange={setCategory} />
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Body text</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
            <button type="submit" disabled={!selected || saving} className="studio-button-primary">
              <FileText className="h-4 w-4" />
              {saving ? "Creating..." : "Create template in Meta"}
            </button>
          </form>
          {result ? (
            <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
              <div className="font-medium">
                Stored template: {result.template.name} / {result.template.status || "UNKNOWN"}
              </div>
              <pre className="mt-3 max-h-48 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface p-3 text-xs">
                {JSON.stringify(result.metaResponse, null, 2)}
              </pre>
            </div>
          ) : null}
        </Panel>
      </section>

      <Panel title="Template submissions">
        <TemplateTable rows={templates} />
      </Panel>

      {metaList ? (
        <Panel title="Latest Meta template list response">
          <pre className="max-h-80 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md bg-background p-4 text-xs">
            {JSON.stringify(metaList, null, 2)}
          </pre>
        </Panel>
      ) : null}
    </div>
  );
}

function TemplateTable({ rows }: { rows: TemplateRows }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No template submissions yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <tr>
            {["Time", "Name", "Language", "Category", "Body", "Meta ID", "Status", "Error"].map(
              (heading) => (
                <th key={heading} className="border-b border-border py-3 pr-4 font-medium">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/70 last:border-0">
              <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                {formatDate(row.created_at)}
              </td>
              <td className="py-3 pr-4 font-medium">{row.name}</td>
              <td className="py-3 pr-4">{row.language}</td>
              <td className="py-3 pr-4">{row.category}</td>
              <td className="max-w-md break-words py-3 pr-4">{row.body}</td>
              <td className="max-w-[180px] truncate py-3 pr-4 text-muted-foreground">
                {row.meta_template_id || "-"}
              </td>
              <td className="py-3 pr-4">{row.status || "-"}</td>
              <td className="max-w-xs py-3 pr-4 text-muted-foreground">
                <span className="break-words">{row.error_message || row.error_code || "-"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-surface/60 p-5">
      <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function Info({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div
        className={warning ? "mt-1 break-words text-amber-300" : "mt-1 break-words text-foreground"}
      >
        {value}
      </div>
    </div>
  );
}

function Alert({ children, tone }: { children: ReactNode; tone?: "error" }) {
  return (
    <div
      className={
        tone === "error"
          ? "rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          : "rounded-md border border-border bg-surface/60 p-3 text-sm text-muted-foreground"
      }
    >
      {children}
    </div>
  );
}

function defaultTemplateName() {
  return `order_update_demo_${Date.now().toString(36).slice(-6)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
