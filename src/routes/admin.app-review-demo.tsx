import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import {
  getAdminLogs,
  getReviewConnections,
  getWaMessageEvents,
  sendReviewWhatsAppMessage,
} from "@/lib/whatsapp/admin-client";
import type { ReviewConnectionSummary } from "@/lib/whatsapp/app-review-demo.server";
import type { WaMessageEventRow } from "@/lib/whatsapp/message-events.server";

export const Route = createFileRoute("/admin/app-review-demo")({
  component: AppReviewDemoPage,
});

type SendResultState = Awaited<ReturnType<typeof sendReviewWhatsAppMessage>>;
type AdminLogs = Awaited<ReturnType<typeof getAdminLogs>>;

function AppReviewDemoPage() {
  const [connections, setConnections] = useState<ReviewConnectionSummary[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [events, setEvents] = useState<WaMessageEventRow[]>([]);
  const [logs, setLogs] = useState<AdminLogs["webhooks"]>([]);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [message, setMessage] = useState("Hello from our WhatsApp SaaS review demo.");
  const [sendResult, setSendResult] = useState<SendResultState>();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => connections.find((connection) => connection.connectionId === connectionId),
    [connectionId, connections],
  );

  const loadConnections = useCallback(async () => {
    const rows = await getReviewConnections();
    setConnections(rows);
    setConnectionId((current) => current || rows[0]?.connectionId || "");
  }, []);

  const refresh = useCallback(async () => {
    if (!selected) return;
    setError("");
    const [nextEvents, nextLogs] = await Promise.all([
      getWaMessageEvents({ connectionId: selected.connectionId }),
      getAdminLogs(selected.businessId),
    ]);
    setEvents(nextEvents);
    setLogs(
      nextLogs.webhooks.filter(
        (log) =>
          !isRecord(log) ||
          !log.connection_id ||
          String(log.connection_id) === selected.connectionId,
      ),
    );
  }, [selected]);

  useEffect(() => {
    setLoading(true);
    loadConnections()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load WhatsApp connections."),
      )
      .finally(() => setLoading(false));
  }, [loadConnections]);

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load demo activity."),
    );
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, [autoRefresh, refresh]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSending(true);
    setError("");
    setSendResult(undefined);
    try {
      const result = await sendReviewWhatsAppMessage({
        connectionId: selected.connectionId,
        recipientPhone,
        body: message,
      });
      setSendResult(result);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send WhatsApp message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Meta App Review Demo
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Messaging</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Use this internal page to demonstrate sending and receiving WhatsApp messages through
            our SaaS. This internal demo is part of the WhatsApp commerce platform operated by THE
            COATING GUYS PTY. LTD. ABN: 40 696 839 899.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} className="studio-button-secondary">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </header>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? <Alert>Loading review connections...</Alert> : null}

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <Panel title="Connection">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Business / WhatsApp number</span>
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
              <Info label="Phone number ID" value={selected.phoneNumberId} />
              <Info label="WABA ID" value={selected.businessAccountId || "Not set"} />
              <Info label="Display number" value={selected.displayPhoneNumber || "Not set"} />
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

        <Panel title="Send test message">
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">
                Recipient WhatsApp number, E.164
              </span>
              <input
                value={recipientPhone}
                onChange={(event) => setRecipientPhone(event.target.value)}
                placeholder="+15551234567"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Message body</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
            <button type="submit" disabled={!selected || sending} className="studio-button-primary">
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send WhatsApp message"}
            </button>
          </form>
          {sendResult ? (
            <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
              <div className="font-medium">
                Meta response: {sendResult.result.ok ? "Accepted by Meta" : "Failed"}
              </div>
              <div className="mt-2 text-muted-foreground">
                Sent at: {formatDate(sendResult.sentAt)}
              </div>
              {sendResult.result.ok ? (
                <p className="mt-2 text-muted-foreground">
                  This means Meta accepted the message request. Delivery is confirmed only when the
                  phone receives it or a delivered/read status appears below.
                </p>
              ) : null}
              <pre className="mt-3 max-h-48 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface p-3 text-xs">
                {JSON.stringify(sendResult.result, null, 2)}
              </pre>
            </div>
          ) : null}
        </Panel>
      </section>

      <Panel
        title="Latest message events"
        action={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
            Auto-refresh
          </label>
        }
      >
        <MessageEventsTable events={events} />
      </Panel>

      <Panel title="Latest webhook logs">
        <WebhookLogTable logs={logs} />
      </Panel>
    </div>
  );
}

function MessageEventsTable({ events }: { events: WaMessageEventRow[] }) {
  if (!events.length)
    return <p className="text-sm text-muted-foreground">No message events yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <tr>
            {[
              "Time",
              "Direction",
              "Sender",
              "Type",
              "Phone",
              "Body / summary",
              "Meta ID",
              "Status",
              "Error",
            ].map((heading) => (
              <th key={heading} className="border-b border-border py-3 pr-4 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-border/70 last:border-0">
              <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                {formatDate(event.created_at)}
              </td>
              <td className="py-3 pr-4 font-medium">{event.direction}</td>
              <td className="py-3 pr-4">{event.sender_type}</td>
              <td className="py-3 pr-4">{event.message_type}</td>
              <td className="py-3 pr-4 text-muted-foreground">
                {event.customer_phone_masked || "-"}
              </td>
              <td className="max-w-md break-words py-3 pr-4">
                {event.body || event.summary || "-"}
              </td>
              <td className="max-w-[180px] truncate py-3 pr-4 text-muted-foreground">
                {event.meta_message_id || "-"}
              </td>
              <td className="py-3 pr-4">{event.status || "-"}</td>
              <td className="max-w-xs py-3 pr-4 text-muted-foreground">
                <span className="break-words">
                  {event.error_message || event.error_code || "-"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WebhookLogTable({ logs }: { logs: AdminLogs["webhooks"] }) {
  if (!logs.length) return <p className="text-sm text-muted-foreground">No webhook logs yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <tr>
            {["Time", "Phone number ID", "Result", "Messages", "Error"].map((heading) => (
              <th key={heading} className="border-b border-border py-3 pr-4 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => {
            const row = isRecord(log) ? log : {};
            return (
              <tr key={String(row.id || index)} className="border-b border-border/70 last:border-0">
                <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                  {formatDate(String(row.created_at || ""))}
                </td>
                <td className="py-3 pr-4">{String(row.phone_number_id || "-")}</td>
                <td className="py-3 pr-4">{String(row.result || "-")}</td>
                <td className="py-3 pr-4">{String(row.message_count || "0")}</td>
                <td className="max-w-md py-3 pr-4 text-muted-foreground">
                  {String(row.error_summary || "-")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-surface/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
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

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
