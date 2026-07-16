import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Building2,
  ClipboardList,
  MessageCircleWarning,
  Phone,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminOverview, type AdminOverview } from "@/features/connect/shared/admin-client";

export const Route = createFileRoute("/connect/admin/")({
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview>();
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminOverview()
      .then(setOverview)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load overview."));
  }, []);

  if (error) return <PageState text={error} />;
  if (!overview) return <PageState text="Loading admin overview..." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <a href="/connect/admin/businesses/new">New business</a>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Businesses" value={overview.totalBusinesses} icon={Building2} />
        <Metric label="Active" value={overview.activeBusinesses} icon={Activity} />
        <Metric label="Connected numbers" value={overview.connectedWhatsAppNumbers} icon={Phone} />
        <Metric label="Orders today" value={overview.ordersToday} icon={ShoppingCart} />
        <Metric
          label="Paused or suspended"
          value={overview.suspendedBusinesses}
          icon={AlertTriangle}
        />
        <Metric
          label="Config issues"
          value={overview.businessesWithConfigurationIssues}
          icon={MessageCircleWarning}
        />
        <Metric
          label="Failed notifications"
          value={overview.failedNotifications}
          icon={AlertTriangle}
        />
        <Metric
          label="Unknown phone events"
          value={overview.unknownPhoneEvents}
          icon={ClipboardList}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-base">Recent admin activity</CardTitle>
          <Button asChild variant="outline" size="sm">
            <a href="/connect/admin/logs">View logs</a>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="border-b border-border py-3 font-medium">Action</th>
                <th className="border-b border-border py-3 font-medium">Business</th>
                <th className="border-b border-border py-3 font-medium">Target</th>
                <th className="border-b border-border py-3 font-medium">Admin</th>
                <th className="border-b border-border py-3 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentAudit.length ? (
                overview.recentAudit.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 font-medium">{row.action}</td>
                    <td className="py-3 text-muted-foreground">{row.business_id || "Global"}</td>
                    <td className="py-3 text-muted-foreground">
                      {row.target_type}
                      {row.target_id ? ` / ${row.target_id}` : ""}
                    </td>
                    <td className="py-3 text-muted-foreground">{row.admin_user_id}</td>
                    <td className="py-3 text-right text-muted-foreground">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-muted-foreground">
                    No admin activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Building2;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
          </div>
          <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-muted-foreground">{text}</CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
