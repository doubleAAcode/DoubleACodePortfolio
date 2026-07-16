import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { logs } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { Search, Download } from "lucide-react";

export const Route = createFileRoute("/connect/admin/logs")({
  head: () => ({ meta: [{ title: "Logs — WA Admin" }] }),
  component: LogsPage,
});

const toneFor = (l: string) =>
  l === "error" ? ("destructive" as const) : l === "warning" ? ("warning" as const) : l === "success" ? ("success" as const) : ("info" as const);

function LogsPage() {
  return (
    <>
      <TopBar
        title="Logs"
        subtitle="Activity across every business and the flow runtime."
        actions={<Button variant="outline"><Download className="h-4 w-4" />Export CSV</Button>}
      />
      <div className="px-4 sm:px-6 pb-10 space-y-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs…" className="pl-8 h-9" />
        </div>
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Level</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3"><StatusBadge tone={toneFor(l.level)}>{l.level}</StatusBadge></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDistanceToNow(l.ts)}</td>
                    <td className="px-4 py-3 font-medium">{l.business}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.message}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
