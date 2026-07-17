import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusinessDetails } from "@/features/connect/admin/businesses/business-details-context";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  getAdminWhatsAppHealth,
  type AdminBusinessDetailsResult,
} from "@/features/connect/shared/admin-client";
import type { WhatsAppConnectionHealth } from "@/features/connect/shared/app-review-demo.server";

export const Route = createFileRoute("/connect/admin/businesses/$id/whatsapp")({
  component: WAConnectionPage,
});

const templateOptions = [
  {
    ids: ["ecommerce", "standard_online_store"],
    name: "E-commerce",
    bestFor: "Product catalogs, browsing by category or brand, checkout on WhatsApp.",
  },
  {
    ids: ["restaurant"],
    name: "Restaurant",
    bestFor: "Menus, delivery vs pickup, order confirmation.",
  },
  {
    ids: ["greeting_store_info"],
    name: "Greeting + Store Info / Price Lists",
    bestFor: "Businesses that share info, hours, and price list images.",
  },
];

function WAConnectionPage() {
  const details = useBusinessDetails();
  const [health, setHealth] = useState<WhatsAppConnectionHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");

  if (!details)
    return <ConnectionState message="Live connection data requires a business session." />;

  const connection = getActiveConnection(details);
  if (!connection) return <ConnectionState message="No WhatsApp connection is configured." />;

  const webhookPath =
    connection.webhook_path ||
    (connection.config_suffix === "2" ? "/api/connect/whatsapp/webhook" : "/api/whatsapp/webhook");
  const selectedTemplate = details.business.template_type || "";

  async function verifyConnection() {
    setChecking(true);
    setCheckError("");
    try {
      setHealth(await getAdminWhatsAppHealth(connection.id));
    } catch (error) {
      setHealth(null);
      setCheckError(error instanceof Error ? error.message : "Could not verify this connection.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-success/10 text-success">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle>WhatsApp Business connection</CardTitle>
              <CardDescription>
                Number, identity, and Meta status for this business.
              </CardDescription>
            </div>
            <StatusBadge
              tone={connection.status === "ACTIVE" ? "success" : "warning"}
              className="ml-auto"
            >
              {connection.status === "ACTIVE" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {connection.status}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ConnectionField
            label="Business display name"
            value={connection.display_name || details.business.name}
          />
          <ConnectionField
            label="WhatsApp number"
            value={connection.display_phone_number || "Not available"}
          />
          <ConnectionField
            label="Meta Business ID"
            value={connection.business_account_id || "Not configured"}
            mono
          />
          <ConnectionField label="Phone number ID" value={connection.phone_number_id} mono />
          <ConnectionField
            label="Webhook URL"
            value={`https://www.doubleacode.com${webhookPath}`}
            mono
            wide
          />

          <div className="space-y-3 border-t pt-4 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Database health check: {formatCheckedAt(connection.last_health_check_at)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={verifyConnection} disabled={checking}>
                  {checking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Re-verify
                </Button>
                <Button size="sm">Save changes</Button>
              </div>
            </div>

            {checkError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {checkError}
              </p>
            ) : null}
            {health ? <ConnectionHealthResult health={health} /> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template selected</CardTitle>
          <CardDescription>Which approved flow this business is built on.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {templateOptions.map((template) => {
            const selected = template.ids.includes(selectedTemplate);
            return (
              <label
                key={template.name}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/40 ${
                  selected ? "border-primary bg-primary/5" : ""
                }`}
              >
                <input type="radio" name="tpl" checked={selected} readOnly className="mt-1" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{template.name}</span>
                  <span className="block text-xs text-muted-foreground">{template.bestFor}</span>
                </span>
              </label>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function ConnectionField({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`space-y-1 ${wide ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      <Input readOnly value={value} className={`bg-muted/50 ${mono ? "font-mono text-sm" : ""}`} />
    </div>
  );
}

function ConnectionHealthResult({ health }: { health: WhatsAppConnectionHealth }) {
  const healthy = health.configComplete && health.meta.ok && health.subscription.ok;
  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        healthy ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"
      }`}
    >
      <div className="flex items-center gap-2 font-medium">
        {healthy ? (
          <ShieldCheck className="h-4 w-4 text-success" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-warning-foreground" />
        )}
        {healthy ? "Meta connection verified" : "Meta connection needs attention"}
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <HealthValue
          label="Runtime configuration"
          value={health.configComplete ? "Complete" : "Incomplete"}
        />
        <HealthValue
          label="Meta API"
          value={health.meta.status ? `HTTP ${health.meta.status}` : "Unavailable"}
        />
        <HealthValue
          label="Phone identity"
          value={health.meta.identityMatches ? "Matched" : "Not verified"}
        />
        <HealthValue
          label="WABA app subscription"
          value={health.subscription.wabaSubscribed ? "Subscribed" : "Not subscribed"}
        />
        <HealthValue
          label="Webhook callback"
          value={health.subscription.callbackMatches ? "Matched" : "Not matched"}
        />
        <HealthValue
          label="Messages field"
          value={health.subscription.messagesSubscribed ? "Subscribed" : "Not subscribed"}
        />
        <HealthValue
          label="Subscription state"
          value={health.subscription.active ? "Active" : "Inactive"}
        />
        <HealthValue label="Quality rating" value={health.meta.qualityRating || "Not available"} />
        <HealthValue label="Verified name" value={health.meta.verifiedName || "Not available"} />
        <HealthValue label="Checked" value={formatCheckedAt(health.checkedAt)} />
      </dl>
      {[health.meta.errorMessage, health.subscription.errorMessage]
        .filter((message): message is string => Boolean(message))
        .map((message) => (
          <p key={message} className="mt-3 text-xs text-muted-foreground">
            {message}
          </p>
        ))}
    </div>
  );
}

function HealthValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ConnectionState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}

function getActiveConnection(details: AdminBusinessDetailsResult) {
  return details.connections.find((connection) => connection.is_active) || details.connections[0];
}

function formatCheckedAt(value: string | null) {
  if (!value) return "Not checked yet";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleString();
}
