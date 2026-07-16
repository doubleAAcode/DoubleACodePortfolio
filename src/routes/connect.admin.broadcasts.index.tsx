import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { broadcasts, type BroadcastStatus } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/connect/admin/broadcasts/")({
  component: BroadcastsPage,
});

const tone: Record<BroadcastStatus, "success" | "info" | "warning" | "destructive" | "neutral"> = {
  sent: "success",
  scheduled: "info",
  sending: "warning",
  draft: "neutral",
  failed: "destructive",
};

function BroadcastsPage() {
  return (
    <>
      <TopBar
        title="Broadcasts"
        subtitle="Send approved WhatsApp templates to a segment of contacts."
        actions={
          <Button size="sm" asChild>
            <Link to="/connect/admin/broadcasts/new"><Plus className="h-4 w-4" />New broadcast</Link>
          </Button>
        }
      />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Read</TableHead>
                <TableHead className="text-right">Replied</TableHead>
                <TableHead className="text-right">Opt-outs</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link to="/connect/admin/broadcasts/$id" params={{ id: b.id }} className="font-medium hover:underline">{b.name}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{b.templateName}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.audience.toLocaleString()}</TableCell>
                  <TableCell><StatusBadge tone={tone[b.status]}>{b.status}</StatusBadge></TableCell>
                  <TableCell className="text-right tabular-nums">{b.delivered.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.read.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.replied.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{b.optOut}</TableCell>
                  <TableCell className="text-right tabular-nums">${b.costUsd.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {b.sentAt ? `Sent ${formatDistanceToNow(b.sentAt)}` : b.scheduledFor ? `Scheduled ${new Date(b.scheduledFor).toLocaleString()}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
