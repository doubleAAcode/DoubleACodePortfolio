import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getWhatsAppWebhookLogs } from "@/lib/whatsapp/webhook-log-functions";

type WebhookLog = Awaited<ReturnType<typeof getWhatsAppWebhookLogs>>["logs"][number];

export const Route = createFileRoute("/logsWABot")({
  head: () => ({
    meta: [
      { title: "WA Bot Logs - Double A Code" },
      {
        name: "description",
        content: "Sanitized WhatsApp webhook GET and POST logs.",
      },
    ],
  }),
  component: LogsWABotPage,
});

function LogsWABotPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const key = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("key") ?? undefined;
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    const result = await getWhatsAppWebhookLogs({ data: { key, limit: 75 } });

    if (result.ok) {
      setLogs(result.logs);
    } else {
      setLogs([]);
      setError(result.error);
    }

    setLoading(false);
  }, [key]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              to="/"
              className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground transition hover:text-foreground"
            >
              Double A Code
            </Link>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">WA Bot Logs</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sanitized webhook hits received from Meta. Tokens, challenges, and full phone numbers
              are not stored.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadLogs()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-md border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Messages</th>
                  <th className="px-4 py-3">Sender</th>
                  <th className="px-4 py-3">Input</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                      Loading logs...
                    </td>
                  </tr>
                ) : logs.length ? (
                  logs.map((log) => (
                    <tr key={log.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3 font-semibold">{log.method}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            log.status >= 200 && log.status < 300
                              ? "text-emerald-400"
                              : "text-destructive"
                          }
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.result}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.message_count}
                        {log.duplicate_count ? ` (${log.duplicate_count} dup)` : ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{log.sender_mask ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.input_types.length ? log.input_types.join(", ") : "-"}
                      </td>
                      <td className="max-w-sm px-4 py-3 text-muted-foreground">
                        {log.error_summary ?? "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                      No webhook logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}
