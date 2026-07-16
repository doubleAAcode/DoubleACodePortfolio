import { createFileRoute } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { clientKpis, billingUsage } from "@/features/connect/flow-manager-ui/preview-data/mock-client";

export const Route = createFileRoute("/connect/client/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Client Dashboard" }] }),
  component: ClientAnalytics,
});

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

function ClientAnalytics() {
  return (
    <>
      <ClientTopBar title="Analytics" subtitle="Understand your customer conversations end to end." />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Tabs className="min-w-0" defaultValue="conversations">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="automations">Automations</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Volume</CardTitle><CardDescription>Last 14 days</CardDescription></CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer>
                  <LineChart data={clientKpis.volumeSeries}>
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line dataKey="conversations" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>By channel</CardTitle></CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={clientKpis.openByChannel} dataKey="value" nameKey="channel" innerRadius={50} outerRadius={90}>
                      {clientKpis.openByChannel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="mt-4">
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Channel-level breakdown with per-channel response times, CSAT, and volume.</CardContent></Card>
          </TabsContent>
          <TabsContent value="agents" className="mt-4">
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Agent leaderboard: conversations handled, first-response time, CSAT, resolution rate.</CardContent></Card>
          </TabsContent>
          <TabsContent value="automations" className="mt-4">
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Per-automation funnel and drop-off charts.</CardContent></Card>
          </TabsContent>

          <TabsContent value="cost" className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Meta conversation cost</CardTitle><CardDescription>This month, by category.</CardDescription></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr><th className="text-left py-1">Category</th><th className="text-right">Conversations</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {billingUsage.map(b => (
                      <tr key={b.category}>
                        <td className="py-2">{b.category}</td>
                        <td className="py-2 text-right tabular-nums">{b.conversations.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums">${b.unitCost.toFixed(4)}</td>
                        <td className="py-2 text-right font-semibold tabular-nums">${b.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t"><td colSpan={3} className="pt-2 font-semibold">Total</td><td className="pt-2 text-right font-semibold tabular-nums">${billingUsage.reduce((s,b) => s + b.total, 0).toFixed(2)}</td></tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>By category</CardTitle></CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={billingUsage}>
                    <XAxis dataKey="category" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
