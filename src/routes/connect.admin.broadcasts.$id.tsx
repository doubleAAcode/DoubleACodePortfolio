import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { broadcasts } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/connect/admin/broadcasts/$id")({
  component: BroadcastDetail,
});

function BroadcastDetail() {
  const { id } = Route.useParams();
  const b = broadcasts.find((x) => x.id === id);
  if (!b) throw notFound();
  const funnel = [
    { step: "Sent", value: b.audience },
    { step: "Delivered", value: b.delivered },
    { step: "Read", value: b.read },
    { step: "Replied", value: b.replied },
  ];

  return (
    <>
      <TopBar
        title={b.name}
        subtitle={`Template: ${b.templateName}`}
        breadcrumbs={
          <Link to="/connect/admin/broadcasts" className="inline-flex items-center gap-1 hover:underline">
            <ChevronLeft className="h-3 w-3" /> Broadcasts
          </Link>
        }
        actions={<StatusBadge>{b.status}</StatusBadge>}
      />
      <div className="px-4 sm:px-6 pb-10 grid gap-4 lg:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Audience</CardTitle></CardHeader><CardContent className="text-2xl font-semibold tabular-nums">{b.audience.toLocaleString()}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Read rate</CardTitle></CardHeader><CardContent className="text-2xl font-semibold tabular-nums">{b.delivered ? Math.round((b.read / b.delivered) * 100) : 0}%</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Cost</CardTitle></CardHeader><CardContent className="text-2xl font-semibold tabular-nums">${b.costUsd.toFixed(2)}</CardContent></Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Delivery funnel</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="step" type="category" width={80} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {b.sentAt ? <>Sent {formatDistanceToNow(b.sentAt)}.</> : <>Not sent yet.</>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
