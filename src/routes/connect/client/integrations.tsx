import { createFileRoute } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { integrations } from "@/features/connect/flow-manager-ui/preview-data/mock-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";

export const Route = createFileRoute("/connect/client/integrations")({
  head: () => ({ meta: [{ title: "Integrations — Client Dashboard" }] }),
  component: ClientIntegrations,
});

function ClientIntegrations() {
  const [q, setQ] = useState("");
  const filtered = integrations.filter(i =>
    !q || i.name.toLowerCase().includes(q.toLowerCase()) || i.category.toLowerCase().includes(q.toLowerCase())
  );
  const categories = Array.from(new Set(integrations.map(i => i.category)));

  return (
    <>
      <ClientTopBar
        title="Integrations"
        subtitle="Connect your existing tools to WhatsApp and every other channel."
      />
      <div className="px-4 sm:px-6 pb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search integrations…" className="pl-8" />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setQ(c)}
                className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent shrink-0"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(i => (
            <Card key={i.id} className="hover:shadow-md transition">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-md text-white font-bold ${i.logoColor}`}>
                    {i.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">{i.name}</div>
                      {i.installed && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          <Check className="h-2.5 w-2.5" /> Installed
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{i.category}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2 min-h-[32px]">{i.description}</p>
                <Button
                  className="mt-3 w-full"
                  variant={i.installed ? "outline" : "default"}
                  size="sm"
                  onClick={() => toast.success(i.installed ? `${i.name} settings opened` : `${i.name} installed`)}
                >
                  {i.installed ? "Configure" : "Install"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
