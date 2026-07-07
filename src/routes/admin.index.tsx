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

import { getAdminOverview, type AdminOverview } from "@/lib/whatsapp/admin-client";

export const Route = createFileRoute("/admin/")({
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Milestone 14</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Internal Admin
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manual onboarding, tenant controls, WhatsApp connection health, and audit visibility.
          </p>
        </div>
        <a href="/admin/businesses/new" className="studio-button-primary w-fit">
          New business
        </a>
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

      <section className="rounded-lg border border-border bg-surface/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-semibold">Recent admin activity</h2>
          <a href="/admin/logs" className="studio-button-secondary">
            View logs
          </a>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
        </div>
      </section>
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
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-8 text-muted-foreground">
      {text}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
