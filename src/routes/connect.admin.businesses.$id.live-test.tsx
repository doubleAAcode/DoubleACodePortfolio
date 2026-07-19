import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquareText,
  RefreshCcw,
  Send,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusinessDetails } from "@/features/connect/admin/businesses/business-details-context";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  getBusinessFlowDetails,
  getWaMessageEvents,
  sendReviewWhatsAppMessage,
} from "@/features/connect/shared/admin-client";
import type { BusinessFlowDetails } from "@/features/connect/shared/flow-template-store.server";
import type { WaMessageEventRow } from "@/features/connect/shared/message-events.server";

export const Route = createFileRoute("/connect/admin/businesses/$id/live-test")({
  component: LiveTestPage,
});

const TEST_TEMPLATE_NAME = "hello_world";
const TEST_TEMPLATE_LANGUAGE = "en_US";

function LiveTestPage() {
  const { id } = Route.useParams();
  const details = useBusinessDetails();
  const connection = details
    ? details.connections.find((item) => item.is_active) || details.connections[0]
    : null;
  const [recipientPhone, setRecipientPhone] = useState("");
  const [flowDetails, setFlowDetails] = useState<BusinessFlowDetails | null>(null);
  const [loadingFlow, setLoadingFlow] = useState(true);
  const [events, setEvents] = useState<WaMessageEventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [sending, setSending] = useState<"template" | "restart" | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "destructive";
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingFlow(true);
    getBusinessFlowDetails(id)
      .then((data) => {
        if (!cancelled) setFlowDetails(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setNotice({
            tone: "destructive",
            message: error instanceof Error ? error.message : "Could not load the published flow.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFlow(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!connection?.id) return;
    let cancelled = false;
    getWaMessageEvents({ connectionId: connection.id })
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setNotice({ tone: "destructive", message: "Could not load live events." });
      });
    return () => {
      cancelled = true;
    };
  }, [connection?.id]);

  if (!details || !connection) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Live testing requires an active WhatsApp connection.
        </CardContent>
      </Card>
    );
  }
  const activeConnection = connection;

  async function refreshLiveTest() {
    setLoadingFlow(true);
    setLoadingEvents(true);
    try {
      const [flow, rows] = await Promise.all([
        getBusinessFlowDetails(id),
        getWaMessageEvents({ connectionId: activeConnection.id }),
      ]);
      setFlowDetails(flow);
      setEvents(rows);
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not refresh live test data.",
      });
    } finally {
      setLoadingFlow(false);
      setLoadingEvents(false);
    }
  }

  async function sendTemplate() {
    if (!isE164(recipientPhone)) {
      setNotice({ tone: "destructive", message: "Enter the test number in E.164 format." });
      return;
    }
    setSending("template");
    setNotice(null);
    try {
      const data = await sendReviewWhatsAppMessage({
        connectionId: activeConnection.id,
        recipientPhone: recipientPhone.trim(),
        templateName: TEST_TEMPLATE_NAME,
        language: TEST_TEMPLATE_LANGUAGE,
      });
      setNotice(
        data.result.ok
          ? { tone: "success", message: "Approved test template sent." }
          : { tone: "destructive", message: data.result.errorMessage },
      );
      await refreshLiveTest();
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not send the test template.",
      });
    } finally {
      setSending(null);
    }
  }

  async function sendRestart() {
    if (!isE164(recipientPhone)) {
      setNotice({ tone: "destructive", message: "Enter the test number in E.164 format." });
      return;
    }
    setSending("restart");
    setNotice(null);
    try {
      const data = await sendReviewWhatsAppMessage({
        connectionId: activeConnection.id,
        recipientPhone: recipientPhone.trim(),
        body: "/restart",
      });
      setNotice(
        data.result.ok
          ? { tone: "success", message: "Restart command sent." }
          : { tone: "destructive", message: data.result.errorMessage },
      );
      await refreshLiveTest();
    } catch (error) {
      setNotice({
        tone: "destructive",
        message: error instanceof Error ? error.message : "Could not send the restart command.",
      });
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Test setup</CardTitle>
          <CardDescription>Current Meta connection and test recipient.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Business WhatsApp number</Label>
            <Input
              readOnly
              value={activeConnection.display_phone_number || "Not available"}
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="live-test-recipient">Test customer number</Label>
            <Input
              id="live-test-recipient"
              value={recipientPhone}
              onChange={(event) => setRecipientPhone(event.target.value)}
              placeholder="+15551234567"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          <div className="grid gap-2 pt-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Button
              data-flow-manager-live-action
              onClick={sendTemplate}
              disabled={Boolean(sending)}
            >
              {sending === "template" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send template
            </Button>
            <Button
              data-flow-manager-live-action
              variant="outline"
              onClick={sendRestart}
              disabled={Boolean(sending)}
            >
              {sending === "restart" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Send /restart
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
          <div className="space-y-2 border-t pt-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Connection</span>
              <StatusBadge tone={activeConnection.status === "ACTIVE" ? "success" : "warning"}>
                {activeConnection.status}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Template</span>
              <span className="font-mono text-xs">{TEST_TEMPLATE_NAME}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Live message events</CardTitle>
              <CardDescription>
                Provider sends, inbound messages, and status callbacks.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshLiveTest}
              disabled={loadingEvents || loadingFlow}
            >
              {loadingEvents || loadingFlow ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <PublishedFlowCard flowDetails={flowDetails} loading={loadingFlow} />
          {events.length ? (
            <div className="divide-y rounded-md border">
              {events.slice(0, 20).map((event) => (
                <MessageEventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-52 place-items-center rounded-md border border-dashed p-6 text-center">
              <div>
                <MessageSquareText className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No events for this connection</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Send the approved template to begin the live roundtrip.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PublishedFlowCard({
  flowDetails,
  loading,
}: {
  flowDetails: BusinessFlowDetails | null;
  loading: boolean;
}) {
  const liveVersion = flowDetails?.activeVersion ?? null;
  const draftVersion =
    flowDetails?.versions
      .filter((version) => version.status === "DRAFT")
      .sort((left, right) => right.version_number - left.version_number)[0] ?? null;
  const stepCount = liveVersion?.flow_json.nodes.length ?? 0;

  return (
    <div
      data-business-live-flow-version={liveVersion?.version_number ?? "none"}
      className="rounded-md border bg-muted/20 p-4"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading published flow under test...
        </div>
      ) : liveVersion ? (
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-info" />
              <p className="font-medium">{flowDetails?.flow?.name ?? liveVersion.flow_json.name}</p>
              <StatusBadge tone="success">Live v{liveVersion.version_number}</StatusBadge>
              {draftVersion ? (
                <StatusBadge tone="info">Draft v{draftVersion.version_number}</StatusBadge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              New inbound WhatsApp chats start on this published version. Existing chats stay pinned
              to the version they already started on.
            </p>
          </div>
          <div className="grid gap-1 text-right text-xs text-muted-foreground">
            <span>{stepCount} steps</span>
            <span>
              Published {formatEventTime(liveVersion.published_at ?? liveVersion.created_at)}
            </span>
            <span className="font-mono">{liveVersion.id.slice(0, 8)}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
          <div>
            <p className="font-medium">No published flow is active</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Publish a valid saved draft before expecting new WhatsApp chats to use this flow.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageEventRow({ event }: { event: WaMessageEventRow }) {
  const failed = event.status === "failed";
  const completed = event.status === "delivered" || event.status === "read";
  return (
    <div className="grid gap-2 p-3 text-sm sm:grid-cols-[7rem_1fr_auto] sm:items-center">
      <div className="flex items-center gap-2">
        {failed ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle2 className={`h-4 w-4 ${completed ? "text-success" : "text-info"}`} />
        )}
        <span className="font-medium capitalize">{event.direction.toLowerCase()}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate">{event.summary || event.body || event.message_type}</p>
        <p className="text-xs text-muted-foreground">{formatEventTime(event.created_at)}</p>
      </div>
      <StatusBadge tone={failed ? "destructive" : completed ? "success" : "info"}>
        {event.status || "unknown"}
      </StatusBadge>
    </div>
  );
}

function isE164(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value.trim());
}

function formatEventTime(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleString();
}
