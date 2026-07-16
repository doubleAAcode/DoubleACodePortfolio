import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { apiKeys, webhooks } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { Plus, Copy, RotateCw, ExternalLink } from "lucide-react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";

export const Route = createFileRoute("/connect/admin/developers")({
  head: () => ({ meta: [{ title: "Developers — WA Admin" }] }),
  component: DevelopersPage,
});

function DevelopersPage() {
  return (
    <>
      <TopBar
        title="Developers"
        subtitle="API keys, webhooks, and documentation for building on this platform."
      />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Tabs className="min-w-0" defaultValue="keys">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="keys">API keys</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="docs">API reference</TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>API keys</CardTitle>
                  <CardDescription>Server-to-server credentials for the WA Admin REST API.</CardDescription>
                </div>
                <Button size="sm" onClick={() => toast.success("New API key created", { description: "Copy it now — it won't be shown again." })}>
                  <Plus className="h-4 w-4" /> New key
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {apiKeys.map((k) => (
                    <li key={k.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{k.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{k.prefix}</code>
                          <span>·</span>
                          <span>Last used {formatDistanceToNow(k.lastUsed)}</span>
                          <span>·</span>
                          <span>By {k.createdBy}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <span key={s} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toast("Key copied")}><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => toast.success("Key rotated")}><RotateCw className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => toast("Revoke blocked in demo")}>Revoke</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Webhook endpoints</CardTitle>
                  <CardDescription>We POST signed JSON events to these URLs.</CardDescription>
                </div>
                <Button size="sm" onClick={() => toast.success("Endpoint added")}><Plus className="h-4 w-4" /> Add endpoint</Button>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {webhooks.map((w) => (
                    <li key={w.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                      <div className="min-w-0">
                        <code className="text-sm font-mono truncate block">{w.url}</code>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Last delivery {formatDistanceToNow(w.lastDelivery)}</span>
                          <span>·</span>
                          <span>{w.events.join(", ")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={w.status === "active" ? "success" : w.status === "failing" ? "destructive" : "neutral"}>
                          {w.status}
                        </StatusBadge>
                        <Button variant="ghost" size="sm" onClick={() => toast("Test event delivered")}>Test</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>API reference</CardTitle>
                <CardDescription>REST + Webhook documentation for building integrations.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: "REST API", desc: "Contacts, conversations, broadcasts, templates" },
                  { title: "Webhooks", desc: "Signed event payloads and delivery guarantees" },
                  { title: "Rate limits", desc: "Per-key and per-endpoint quotas" },
                  { title: "Errors", desc: "Error codes and retry semantics" },
                ].map((d) => (
                  <a key={d.title} href="#" className="rounded-lg border p-4 hover:bg-accent transition">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{d.title}</div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{d.desc}</div>
                  </a>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
