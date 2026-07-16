import { createFileRoute } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { metaTemplates } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/connect/client/templates")({
  head: () => ({ meta: [{ title: "Templates — Client Dashboard" }] }),
  component: ClientTemplates,
});

function ClientTemplates() {
  return (
    <>
      <ClientTopBar
        title="WhatsApp Templates"
        subtitle="Meta-approved templates you can use in broadcasts and automations."
        actions={<Button><Plus className="h-4 w-4" />Submit template</Button>}
      />
      <div className="px-4 sm:px-6 pb-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {metaTemplates.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.category} · {t.languages.join(", ")}</div>
                </div>
                <StatusBadge tone={
                  t.status === "approved" ? "success" :
                  t.status === "rejected" ? "destructive" :
                  t.status === "paused" ? "warning" : "info"
                }>{t.status}</StatusBadge>
              </div>
              <div className="mt-3 rounded border bg-muted/20 p-2.5 text-xs text-muted-foreground line-clamp-3">{t.body}</div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Quality: <b className={t.quality === "high" ? "text-emerald-600" : t.quality === "medium" ? "text-amber-600" : "text-red-600"}>{t.quality}</b></span>
                <span>Last used: {t.lastUsed ? new Date(t.lastUsed).toLocaleDateString() : "—"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
