import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BusinessStatusBadge, StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { businesses, logs, overviewStats } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { ArrowUpRight, Building2, MessageSquare, AlertTriangle, Activity, PlusCircle, ExternalLink, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";

export const Route = createFileRoute("/connect/admin/")({
  head: () => ({
    meta: [{ title: "Overview — WhatsApp Business Admin" }],
  }),
  component: OverviewPage,
});

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Building2;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "text-warning-foreground bg-warning/10"
      : tone === "success"
        ? "text-success bg-success/10"
        : "text-primary bg-primary/10";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          </div>
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${toneClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewPage() {
  return (
    <>
      <TopBar
        title="Overview"
        subtitle="What's happening across all WhatsApp business accounts you manage."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/connect/admin/logs">
                <Activity className="h-4 w-4" />
                Open logs
              </Link>
            </Button>
            <Button asChild>
              <Link to="/connect/admin/businesses">
                <PlusCircle className="h-4 w-4" />
                New business
              </Link>
            </Button>
          </>
        }
      />
      <div className="space-y-6 px-4 sm:px-6 pb-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active businesses" value={String(overviewStats.activeBusinesses)} hint="Live and messaging" icon={Building2} tone="success" />
          <StatCard label="In onboarding" value={String(overviewStats.onboarding)} hint="Waiting on setup" icon={PlusCircle} />
          <StatCard label="Conversations 24h" value={overviewStats.liveConversations24h.toLocaleString()} hint="Across all live flows" icon={MessageSquare} />
          <StatCard label="Failed sends 24h" value={String(overviewStats.failedSends24h)} hint="Meta API errors" icon={AlertTriangle} tone="warning" />
        </div>

        {/* Client dashboard preview banner */}
        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">Client Dashboard preview</div>
                <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-medium">PHASE 2</span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Preview the respond.io-tier surface your clients will log into — omnichannel inbox, AI agent, workflow canvas, integrations marketplace.
              </p>
            </div>
            <Button asChild>
              <Link to="/connect/client">
                Open preview <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>


        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle>Businesses needing attention</CardTitle>
                <CardDescription>Onboarding or draft changes not yet published.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/connect/admin/businesses">
                  View all
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y">
                {businesses
                  .filter((b) => b.status !== "live" || b.draftVersion > b.liveVersion)
                  .slice(0, 5)
                  .map((b) => (
                    <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 sm:flex sm:items-center sm:gap-4">
                      <div className="min-w-0">
                        <Link to="/connect/admin/businesses/$id" params={{ id: b.id }} className="truncate text-sm font-medium hover:underline">
                          {b.name}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">
                          {b.category} · {b.waNumber}
                        </div>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 items-center gap-2 justify-end">
                        <BusinessStatusBadge status={b.status} />
                        <span className="text-xs text-muted-foreground tabular-nums">{b.progress}%</span>
                      </div>
                      <div className="sm:hidden justify-self-end">
                        <BusinessStatusBadge status={b.status} />
                      </div>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Last events across the console.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {logs.slice(0, 5).map((l) => (
                  <li key={l.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        tone={
                          l.level === "error"
                            ? "destructive"
                            : l.level === "warning"
                              ? "warning"
                              : l.level === "success"
                                ? "success"
                                : "info"
                        }
                      >
                        {l.level}
                      </StatusBadge>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(l.ts)}</span>
                    </div>
                    <div className="mt-1 truncate font-medium">{l.business}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{l.message}</div>
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
