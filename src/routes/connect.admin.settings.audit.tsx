import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { auditEntries } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/connect/admin/settings/audit")({
  component: AuditPage,
});

function AuditPage() {
  const [q, setQ] = useState("");
  const list = auditEntries.filter((a) => !q || `${a.actor} ${a.action} ${a.entity}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>Every change made in this workspace, with actor and diff.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 max-w-sm">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by actor, action, entity" className="h-9" />
          </div>
          <ul className="divide-y">
            {list.map((a) => (
              <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{a.actor}</span>
                    <span className="text-muted-foreground"> · </span>
                    <code className="font-mono text-xs rounded bg-muted px-1.5 py-0.5">{a.action}</code>
                    <span className="text-muted-foreground"> · </span>
                    <span>{a.entity}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.diff}</div>
                </div>
                <div className="text-xs text-muted-foreground">{formatDistanceToNow(a.ts)}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
