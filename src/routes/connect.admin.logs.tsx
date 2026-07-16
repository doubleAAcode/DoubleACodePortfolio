import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { getAdminLogs } from "@/features/connect/shared/admin-client";

export const Route = createFileRoute("/connect/admin/logs")({
  component: AdminLogsPage,
});

type LogsResult = Awaited<ReturnType<typeof getAdminLogs>>;

export function AdminLogsPage() {
  const [businessId, setBusinessId] = useState("");
  const [logs, setLogs] = useState<LogsResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback((nextBusinessId: string) => {
    setLoading(true);
    setError("");
    getAdminLogs(nextBusinessId.trim() || undefined)
      .then(setLogs)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load logs."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Audit</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Logs</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Business-scoped webhook outcomes and internal admin actions.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          load(businessId);
        }}
        className="flex max-w-2xl flex-col gap-3 sm:flex-row"
      >
        <input
          value={businessId}
          onChange={(event) => setBusinessId(event.target.value)}
          placeholder="Optional business ID"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="studio-button-secondary">
          Filter
        </button>
      </form>

      {error ? <PageState text={error} /> : null}
      {loading ? <PageState text="Loading logs..." /> : null}

      {logs ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <LogTable
            title="Webhook logs"
            empty="No webhook logs found."
            rows={logs.webhooks as Array<Record<string, unknown>>}
            columns={["created_at", "business_id", "phone_number_id", "result", "error_summary"]}
          />
          <LogTable
            title="Admin audit"
            empty="No admin audit events found."
            rows={logs.audit as Array<Record<string, unknown>>}
            columns={["created_at", "admin_user_id", "business_id", "action", "target_type"]}
          />
        </div>
      ) : null}
    </div>
  );
}

function LogTable({
  title,
  empty,
  rows,
  columns,
}: {
  title: string;
  empty: string;
  rows: Array<Record<string, unknown>>;
  columns: string[];
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/60 p-5">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b border-border py-3 pr-4 font-medium">
                  {column.replaceAll("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={String(row.id || index)}
                  className="border-b border-border/70 last:border-0"
                >
                  {columns.map((column) => (
                    <td
                      key={column}
                      className="max-w-[220px] truncate py-3 pr-4 text-muted-foreground"
                    >
                      {formatCell(row[column])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-6 text-muted-foreground">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-8 text-muted-foreground">
      {text}
    </div>
  );
}

function formatCell(value: unknown) {
  if (typeof value !== "string") return value == null ? "" : String(value);
  if (value.includes("T") && value.endsWith("Z")) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }
  return value;
}
