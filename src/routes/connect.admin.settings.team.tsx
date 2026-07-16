import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { teamMembers, type Role } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { Plus } from "lucide-react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";

export const Route = createFileRoute("/connect/admin/settings/team")({
  component: TeamPage,
});

const roleTone: Record<Role, "success" | "info" | "warning" | "neutral"> = {
  Owner: "success",
  Admin: "info",
  Agent: "warning",
  Viewer: "neutral",
};

function TeamPage() {
  return (
    <div className="max-w-4xl space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Team members</CardTitle>
            <CardDescription>People with access to this admin console.</CardDescription>
          </div>
          <Button size="sm" onClick={() => toast.success("Invite sent")}><Plus className="h-4 w-4" />Invite</Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {teamMembers.map((m) => (
              <li key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {m.name.split(" ").map((s) => s[0]).join("")}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{m.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.email} · {m.businesses.join(", ")}</div>
                </div>
                <StatusBadge tone={roleTone[m.role]}>{m.role}</StatusBadge>
                <div className="text-xs text-muted-foreground">Active {formatDistanceToNow(m.lastActive)}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Roles</CardTitle><CardDescription>What each role can do.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {[
            { r: "Owner", d: "Full access, billing, delete workspace" },
            { r: "Admin", d: "Manage businesses, templates, broadcasts, team" },
            { r: "Agent", d: "Reply in inbox, view contacts, no publish rights" },
            { r: "Viewer", d: "Read-only access to analytics and logs" },
          ].map((x) => (
            <div key={x.r} className="rounded-md border p-3">
              <div className="font-medium text-sm">{x.r}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{x.d}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
