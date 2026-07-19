import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Search,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusinessDetails } from "@/features/connect/admin/businesses/business-details-context";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  inspectAdminCustomerConversation,
  resetAdminCustomerConversation,
  type AdminConversationDiagnostics,
} from "@/features/connect/shared/admin-client";
import type { WaMessageEventRow } from "@/features/connect/shared/message-events.server";

export const Route = createFileRoute("/connect/admin/businesses/$id/diagnostics")({
  component: DiagnosticsPage,
});

function DiagnosticsPage() {
  const { id } = Route.useParams();
  const details = useBusinessDetails();
  const [customerPhone, setCustomerPhone] = useState("");
  const [report, setReport] = useState<AdminConversationDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "destructive"; message: string } | null>(
    null,
  );

  if (!details) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Live diagnostics require a loaded business session.
        </CardContent>
      </Card>
    );
  }

  const activeConnection =
    details.connections.find((connection) => connection.is_active) ??
    details.connections[0] ??
    null;

  async function lookupConversation() {
    if (!isWhatsAppPhoneLookup(customerPhone)) {
      setNotice({
        tone: "destructive",
        message: "Enter the customer phone with digits and optional +.",
      });
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const nextReport = await inspectAdminCustomerConversation(id, customerPhone.trim());
      setReport(nextReport);
      setNotice(null);
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not inspect this conversation.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function resetConversation() {
    if (!isWhatsAppPhoneLookup(customerPhone)) {
      setNotice({
        tone: "destructive",
        message: "Enter the customer phone with digits and optional +.",
      });
      return;
    }
    if (
      !window.confirm("Reset this customer's active WhatsApp session? Message history remains.")
    ) {
      return;
    }
    setResetting(true);
    setNotice(null);
    try {
      const nextReport = await resetAdminCustomerConversation(id, customerPhone.trim());
      setReport(nextReport);
      setNotice({
        tone: "success",
        message: "Conversation session reset. Message events were left intact.",
      });
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not reset this conversation.",
      });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4" data-business-diagnostics-live="true">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Support diagnostics</CardTitle>
          <CardDescription>
            Inspect the real WhatsApp connection, setup health, pinned runtime session, and message
            events for this business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px] flex-1 space-y-1">
              <Label htmlFor="diagnostics-customer-phone" className="text-xs">
                Customer phone
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="diagnostics-customer-phone"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void lookupConversation();
                  }}
                  placeholder="+96171255749"
                  inputMode="tel"
                  autoComplete="tel"
                  className="pl-8"
                />
              </div>
            </div>
            <Button onClick={lookupConversation} disabled={loading || resetting}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Look up
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={resetConversation}
              disabled={loading || resetting}
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reset session
            </Button>
          </div>
          {notice ? (
            <div
              className={`rounded-md border p-3 text-sm ${
                notice.tone === "success"
                  ? "border-success/30 bg-success/5 text-success"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              {notice.message}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection</CardTitle>
            <CardDescription>Current configured WhatsApp identity.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <Field label="Business" value={details.business.name} />
            <Field
              label="WhatsApp"
              value={activeConnection?.display_phone_number || "Not configured"}
            />
            <Field label="Connection" value={activeConnection?.status || "Missing"} />
            <Field label="Phone ID" value={activeConnection?.phone_number_id || "Missing"} mono />
            <Field label="Health" value={details.health.status} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Business health checks</CardTitle>
                <CardDescription>
                  Real setup, connection, webhook, catalog, checkout, and flow checks.
                </CardDescription>
              </div>
              <StatusBadge tone={healthTone(details.health.status)}>
                {details.health.status}
              </StatusBadge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {details.health.checks.map((check) => (
                <div key={check.code} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{check.label}</span>
                    <StatusBadge tone={healthTone(check.status)}>{check.status}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{check.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <SessionSnapshot report={report} />
        <RuntimeEvidence report={report} />
        <MessageTrace events={report?.events ?? []} />
      </div>
    </div>
  );
}

function SessionSnapshot({ report }: { report: AdminConversationDiagnostics | null }) {
  const session = report?.session ?? null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Session snapshot</CardTitle>
        <CardDescription>Active customer runtime state.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {!report ? (
          <EmptyBlock message="Look up a customer phone to inspect its active session." />
        ) : session ? (
          <>
            <Field label="Customer" value={report.customerPhoneMasked} />
            {report.matchedCustomerPhoneMasked ? (
              <Field label="Stored phone" value={report.matchedCustomerPhoneMasked} />
            ) : null}
            <Field label="Current step" value={session.currentStep} />
            <Field label="Current node" value={session.currentNodeId || "Not linked"} mono />
            <Field label="Language" value={session.language?.toUpperCase() || "Not selected"} />
            <Field label="Last message" value={formatTime(session.lastCustomerMessageAt)} />
            <Field label="Expires" value={formatTime(session.expiresAt)} />
          </>
        ) : (
          <EmptyBlock message="No active session found for this customer." />
        )}
      </CardContent>
    </Card>
  );
}

function RuntimeEvidence({ report }: { report: AdminConversationDiagnostics | null }) {
  const session = report?.session ?? null;
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Runtime version evidence</CardTitle>
            <CardDescription>
              Shows whether this conversation is pinned to a saved published flow version.
            </CardDescription>
          </div>
          {session?.flowVersionId ? (
            <StatusBadge tone="success">Pinned</StatusBadge>
          ) : (
            <StatusBadge tone="warning">No active pin</StatusBadge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!report ? (
          <EmptyBlock message="Run a lookup to see runtime pinning evidence." />
        ) : session ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <EvidenceCard label="Business flow" value={session.businessFlowId || "Not linked"} />
            <EvidenceCard
              label="Flow version"
              value={session.flowVersionId || "Not linked"}
              important={Boolean(session.flowVersionId)}
            />
            <EvidenceCard label="Current node" value={session.currentNodeId || "Not linked"} />
            <EvidenceCard label="Updated" value={formatTime(session.updatedAt)} />
          </div>
        ) : (
          <EmptyBlock message="This customer has no active pinned runtime session." />
        )}
      </CardContent>
    </Card>
  );
}

function MessageTrace({ events }: { events: WaMessageEventRow[] }) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Message trace</CardTitle>
            <CardDescription>Real inbound, outbound, and provider status events.</CardDescription>
          </div>
          <StatusBadge tone={events.length ? "info" : "neutral"}>
            {events.length} events
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent>
        {events.length ? (
          <div className="divide-y rounded-md border">
            {events.map((event) => (
              <MessageEventItem key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyBlock message="No message events loaded yet." />
        )}
      </CardContent>
    </Card>
  );
}

function MessageEventItem({ event }: { event: WaMessageEventRow }) {
  const failed = event.status === "failed";
  const completed = event.status === "delivered" || event.status === "read";
  return (
    <div className="grid gap-2 p-3 text-sm sm:grid-cols-[8rem_1fr_auto] sm:items-center">
      <div className="flex items-center gap-2">
        {failed ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : completed ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <Clock className="h-4 w-4 text-info" />
        )}
        <span className="font-medium capitalize">{event.direction.toLowerCase()}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate">{event.summary || event.body || event.message_type}</p>
        <p className="text-xs text-muted-foreground">{formatTime(event.created_at)}</p>
      </div>
      <StatusBadge tone={failed ? "destructive" : completed ? "success" : "info"}>
        {event.status || "unknown"}
      </StatusBadge>
    </div>
  );
}

function EvidenceCard({
  label,
  value,
  important = false,
}: {
  label: string;
  value: string;
  important?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        important ? "border-success/30 bg-success/5" : "bg-muted/20"
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-mono text-xs font-medium">{value}</div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-2 py-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className={mono ? "break-all font-mono text-xs" : "font-medium"}>{value}</div>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="grid min-h-24 place-items-center rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
      <div>
        <MessageSquareText className="mx-auto h-5 w-5" />
        <p className="mt-2">{message}</p>
      </div>
    </div>
  );
}

function healthTone(status: "OK" | "WARNING" | "ERROR") {
  if (status === "OK") return "success" as const;
  if (status === "WARNING") return "warning" as const;
  return "destructive" as const;
}

function isWhatsAppPhoneLookup(value: string) {
  return /^\+?[1-9]\d{7,14}$/.test(value.trim().replace(/[\s()-]/g, ""));
}

function formatTime(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleString();
}
