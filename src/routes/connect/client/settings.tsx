import { createFileRoute } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { billingUsage } from "@/features/connect/flow-manager-ui/preview-data/mock-client";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/connect/client/settings")({
  head: () => ({ meta: [{ title: "Settings — Client Dashboard" }] }),
  component: ClientSettings,
});

const teamMembers = [
  { name: "Amira Khoury", email: "amira@atlas.ae", role: "Owner", status: "active" },
  { name: "Layla Mansour", email: "layla@atlas.ae", role: "Manager", status: "active" },
  { name: "Zaid Farah", email: "zaid@atlas.ae", role: "Agent", status: "active" },
  { name: "Nadia Rashid", email: "nadia@atlas.ae", role: "Agent", status: "invited" },
];

const audit = [
  { who: "Amira Khoury", what: "Enabled AI Agent on Instagram", when: "2 min ago" },
  { who: "Layla Mansour", what: "Sent broadcast 'Ramadan promo'", when: "3 hours ago" },
  { who: "Zaid Farah", what: "Closed conversation #mc_003", when: "6 hours ago" },
  { who: "System", what: "Meta template 'order_shipped' approved", when: "yesterday" },
];

function ClientSettings() {
  return (
    <>
      <ClientTopBar title="Settings" subtitle="Workspace, team, billing, and audit." />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Tabs className="min-w-0" defaultValue="workspace">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="team">Team & roles</TabsTrigger>
            <TabsTrigger value="billing">Billing & usage</TabsTrigger>
            <TabsTrigger value="profile">Business profile</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          <TabsContent value="workspace" className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>General</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><label className="text-xs text-muted-foreground">Workspace name</label><Input defaultValue="Atlas Electronics" className="mt-1" /></div>
                <div><label className="text-xs text-muted-foreground">Timezone</label><Input defaultValue="Asia/Dubai (GMT+4)" className="mt-1" /></div>
                <div><label className="text-xs text-muted-foreground">Default language</label><Input defaultValue="Arabic + English" className="mt-1" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center justify-between text-sm"><span>Right-to-left layout</span><Switch /></label>
                <label className="flex items-center justify-between text-sm"><span>Play sound on new message</span><Switch defaultChecked /></label>
                <label className="flex items-center justify-between text-sm"><span>Auto-translate incoming messages</span><Switch defaultChecked /></label>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <div className="flex justify-end mb-3"><Button><Plus className="h-4 w-4" />Invite member</Button></div>
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th></tr>
                </thead>
                <tbody className="divide-y">
                  {teamMembers.map(m => (
                    <tr key={m.email}>
                      <td className="p-3 font-medium">{m.name}</td>
                      <td className="p-3 text-muted-foreground">{m.email}</td>
                      <td className="p-3"><span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-xs">{m.role}</span></td>
                      <td className="p-3"><span className={`text-xs ${m.status === "active" ? "text-emerald-600" : "text-amber-600"}`}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Meta conversation usage — November</CardTitle><CardDescription>Billed monthly by Meta pricing category.</CardDescription></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr><th className="text-left p-3">Category</th><th className="text-right p-3">Conversations</th><th className="text-right p-3">Unit cost</th><th className="text-right p-3">Total</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {billingUsage.map(b => (
                      <tr key={b.category}>
                        <td className="p-3">{b.category}</td>
                        <td className="p-3 text-right tabular-nums">{b.conversations.toLocaleString()}</td>
                        <td className="p-3 text-right tabular-nums">${b.unitCost.toFixed(4)}</td>
                        <td className="p-3 text-right font-semibold tabular-nums">${b.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t bg-muted/20"><td colSpan={3} className="p-3 font-semibold">Total</td><td className="p-3 text-right font-semibold tabular-nums">${billingUsage.reduce((s,b)=>s+b.total,0).toFixed(2)}</td></tr></tfoot>
                </table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Plan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-semibold">Scale</div>
                <div className="text-sm text-muted-foreground">$299/mo · up to 15 seats · unlimited channels</div>
                <Button className="w-full" variant="outline">Manage plan</Button>
                <Button className="w-full" variant="ghost">View invoices</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <Card><CardContent className="p-6 space-y-3">
              <div><label className="text-xs text-muted-foreground">Legal business name</label><Input defaultValue="Atlas Electronics Trading LLC" className="mt-1" /></div>
              <div><label className="text-xs text-muted-foreground">Meta Business Manager ID</label><Input defaultValue="24193881029" className="mt-1" /></div>
              <div><label className="text-xs text-muted-foreground">Website</label><Input defaultValue="https://atlaselectronics.ae" className="mt-1" /></div>
              <div><label className="text-xs text-muted-foreground">Category</label><Input defaultValue="Electronics retail" className="mt-1" /></div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr><th className="text-left p-3">Actor</th><th className="text-left p-3">Action</th><th className="text-left p-3">When</th></tr>
                </thead>
                <tbody className="divide-y">
                  {audit.map((a, i) => (
                    <tr key={i}><td className="p-3 font-medium">{a.who}</td><td className="p-3">{a.what}</td><td className="p-3 text-muted-foreground text-xs">{a.when}</td></tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
