import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analytics } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { businesses } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { ArrowUp, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/connect/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — WA Admin" }] }),
  component: AnalyticsPage,
});

const colors = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))"];

function Kpi({ label, value, delta, suffix }: { label: string; value: string; delta: number; suffix?: string }) {
  const up = delta >= 0;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}{suffix}</div>
        <div className={`mt-1 text-xs inline-flex items-center gap-0.5 ${up ? "text-success" : "text-destructive"}`}>
          {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(delta)}% vs previous period
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsPage() {
  return (
    <>
      <TopBar
        title="Analytics"
        subtitle="Conversation, flow, template, and cost analytics across all businesses."
        actions={
          <>
            <Select defaultValue="all">
              <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All businesses</SelectItem>
                {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select defaultValue="14d">
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="14d">Last 14 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <div className="px-4 sm:px-6 pb-10 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Conversations" value={analytics.kpis.conversations.value.toLocaleString()} delta={analytics.kpis.conversations.delta} />
          <Kpi label="Avg first response" value={String(analytics.kpis.responseSecs.value)} suffix="s" delta={analytics.kpis.responseSecs.delta} />
          <Kpi label="Resolution rate" value={String(analytics.kpis.resolution.value)} suffix="%" delta={analytics.kpis.resolution.delta} />
          <Kpi label="Meta cost" value={`$${analytics.kpis.cost.value.toFixed(2)}`} delta={analytics.kpis.cost.delta} />
        </div>

        <Tabs className="min-w-0" defaultValue="conversations">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="flows">Flows</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Inbound vs outbound</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.conversationsSeries}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line dataKey="inbound" stroke={colors[0]} strokeWidth={2} dot={false} />
                    <Line dataKey="outbound" stroke={colors[1]} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flows" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Flow funnel drop-off</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.funnel} layout="vertical" margin={{ left: 60 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="step" type="category" width={100} tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="users" fill={colors[0]} radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Template performance</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.templatePerf}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" fill={colors[0]} radius={4} />
                    <Bar dataKey="read" fill={colors[1]} radius={4} />
                    <Bar dataKey="replied" fill={colors[3]} radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Agent performance</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="py-2">Agent</th>
                      <th className="text-right">Handled</th>
                      <th className="text-right">Avg first reply</th>
                      <th className="text-right">CSAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.agents.map((a) => (
                      <tr key={a.name} className="border-b last:border-0">
                        <td className="py-2">{a.name}</td>
                        <td className="text-right tabular-nums">{a.handled}</td>
                        <td className="text-right tabular-nums">{a.avgFirstReplySecs}s</td>
                        <td className="text-right tabular-nums">{a.csat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cost" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Cost by Meta category</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.costBreakdown} dataKey="value" nameKey="category" outerRadius={100} label>
                      {analytics.costBreakdown.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
