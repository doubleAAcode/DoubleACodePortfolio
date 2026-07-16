import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clientKpis, channelStatuses, automations } from "@/features/connect/flow-manager-ui/preview-data/mock-client";
import { ChannelBadge } from "@/features/connect/flow-manager-ui/components/channel-badge";
import {
  MessageSquare, Timer, Smile, Sparkles, ArrowUpRight, Zap,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

export const Route = createFileRoute("/connect/client/")({
  head: () => ({ meta: [{ title: "Home — Client Dashboard" }] }),
  component: ClientHome,
});

function Kpi({ label, value, hint, icon: Icon, tone = "primary" }: { label: string; value: string; hint: string; icon: typeof MessageSquare; tone?: string }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    ai: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          </div>
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${tones[tone]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClientHome() {
  return (
    <>
      <ClientTopBar
        title="Good morning, Amira"
        subtitle="Here's what's happening across your channels today."
        actions={
          <>
            <Button variant="outline" asChild><Link to="/connect/client/broadcasts">New broadcast</Link></Button>
            <Button asChild><Link to="/connect/client/inbox">Open inbox</Link></Button>
          </>
        }
      />
      <div className="space-y-6 px-4 sm:px-6 pb-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Conversations today" value={String(clientKpis.conversationsToday)} hint="+12% vs yesterday" icon={MessageSquare} />
          <Kpi label="Median response" value={`${clientKpis.responseTimeMedianSec}s`} hint="Target: under 60s" icon={Timer} tone="success" />
          <Kpi label="CSAT (7d)" value={`${clientKpis.csatPct}%`} hint="482 responses" icon={Smile} tone="success" />
          <Kpi label="AI deflection" value={`${clientKpis.aiDeflectionPct}%`} hint="Resolved without human" icon={Sparkles} tone="ai" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Conversation volume — last 14 days</CardTitle>
              <CardDescription>Opened vs resolved.</CardDescription>
            </CardHeader>
            <CardContent className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clientKpis.volumeSeries}>
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line dataKey="conversations" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line dataKey="resolved" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open by channel</CardTitle>
              <CardDescription>Right now</CardDescription>
            </CardHeader>
            <CardContent className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientKpis.openByChannel} layout="vertical">
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="channel" type="category" fontSize={11} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle>Channels</CardTitle>
                <CardDescription>Connection health.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/connect/client/channels">Manage<ArrowUpRight className="h-4 w-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {channelStatuses.slice(0, 5).map((c) => (
                  <li key={c.channel} className="flex items-center gap-3 py-2.5">
                    <ChannelBadge channel={c.channel} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{c.handle}</div>
                    </div>
                    <span className={`text-[11px] font-medium ${
                      c.status === "connected" ? "text-emerald-600" :
                      c.status === "action-required" ? "text-amber-600" : "text-muted-foreground"
                    }`}>
                      {c.status === "connected" ? "● Live" : c.status === "action-required" ? "● Action required" : "○ Off"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle>Automations</CardTitle>
                <CardDescription>Active workflows.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/connect/client/automations">View all<ArrowUpRight className="h-4 w-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {automations.filter(a => a.status === "active").map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground">{a.runs30d.toLocaleString()} runs · {a.successRate}% success</div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
