import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { flowTemplates } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { ArrowRight, ShoppingBag, Utensils, Store } from "lucide-react";

export const Route = createFileRoute("/connect/admin/flow-templates")({
  head: () => ({ meta: [{ title: "Flow templates — WA Admin" }] }),
  component: FlowTemplatesPage,
});

const iconFor = (id: string) => {
  if (id === "tpl_ecom") return <ShoppingBag className="h-5 w-5" />;
  if (id === "tpl_restaurant") return <Utensils className="h-5 w-5" />;
  return <Store className="h-5 w-5" />;
};

function FlowTemplatesPage() {
  return (
    <>
      <TopBar
        title="Flow templates"
        subtitle="Approved WhatsApp conversation templates admins can use to onboard a new business."
      />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {flowTemplates.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                    {iconFor(t.id)}
                  </div>
                  <div>
                    <CardTitle>{t.name}</CardTitle>
                    <CardDescription>Approved template</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Best for</div>
                  <p className="text-sm">{t.bestFor}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Included journey</div>
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    {t.journey.map((j, i) => (
                      <span key={j} className="flex items-center gap-1">
                        <span className="rounded bg-accent text-accent-foreground px-2 py-0.5">{j}</span>
                        {i < t.journey.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Supported actions</div>
                  <div className="flex flex-wrap gap-1">
                    {t.actions.map((a) => (
                      <span key={a} className="rounded border px-2 py-0.5 text-xs text-muted-foreground">{a}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full">Start from template</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
