import { createFileRoute } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { clientApiKeys, clientWebhooks } from "@/features/connect/flow-manager-ui/preview-data/mock-client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RotateCw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";

export const Route = createFileRoute("/connect/client/developers")({
  head: () => ({ meta: [{ title: "Developers — Client Dashboard" }] }),
  component: ClientDevelopers,
});

function ClientDevelopers() {
  return (
    <>
      <ClientTopBar title="Developers" subtitle="Build on top of your inbox — API, webhooks, events." />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Tabs className="min-w-0" defaultValue="keys">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="keys">API keys</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="events">Event reference</TabsTrigger>
            <TabsTrigger value="playground">Playground</TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button><Plus className="h-4 w-4" />New key</Button>
            </div>
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr><th className="text-left p-3">Label</th><th className="text-left p-3">Key</th><th className="text-left p-3">Scopes</th><th className="text-left p-3">Last used</th><th /></tr>
                </thead>
                <tbody className="divide-y">
                  {clientApiKeys.map(k => (
                    <tr key={k.id}>
                      <td className="p-3 font-medium">{k.label}</td>
                      <td className="p-3 font-mono text-xs">{k.prefix}…••••</td>
                      <td className="p-3 text-xs">{k.scopes.join(", ")}</td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDistanceToNow(k.lastUsed)}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => toast.success("Key rotated")}><RotateCw className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toast("Key revoked")}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-4">
            <div className="flex justify-end mb-3"><Button><Plus className="h-4 w-4" />New endpoint</Button></div>
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr><th className="text-left p-3">URL</th><th className="text-left p-3">Events</th><th className="text-left p-3">Status</th><th className="text-left p-3">Last delivery</th></tr>
                </thead>
                <tbody className="divide-y">
                  {clientWebhooks.map(w => (
                    <tr key={w.id}>
                      <td className="p-3 font-mono text-xs truncate max-w-xs">{w.url}</td>
                      <td className="p-3 text-xs">{w.events.join(", ")}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          w.status === "healthy" ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"
                        }`}>{w.status}</span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDistanceToNow(w.lastDelivery)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <Card><CardContent className="p-6 text-sm space-y-2">
              <div className="font-medium">Available events</div>
              <ul className="text-muted-foreground space-y-1 font-mono text-xs">
                <li>message.received</li>
                <li>message.sent</li>
                <li>conversation.opened</li>
                <li>conversation.assigned</li>
                <li>conversation.closed</li>
                <li>contact.created</li>
                <li>contact.updated</li>
                <li>automation.triggered</li>
                <li>ai.escalation</li>
              </ul>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="playground" className="mt-4">
            <Card><CardContent className="p-6">
              <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto"><code>{`curl https://api.example.com/v1/messages \\
  -H "Authorization: Bearer sk_live_..." \\
  -d '{"to":"+971509910022","channel":"whatsapp","template":"order_shipped"}'`}</code></pre>
              <Button className="mt-3" onClick={() => toast.success("Sent — 200 OK")}>Try it</Button>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
