import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { Search, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/connect/admin/businesses/$id/diagnostics")({
  component: DiagnosticsPage,
});

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-2 py-1.5 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs" : "font-medium"}>{value}</div>
    </div>
  );
}

function DiagnosticsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Support diagnostics</CardTitle>
          <CardDescription>Look up any customer conversation to see what happened.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[240px] space-y-1">
              <Label className="text-xs">Customer phone</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input defaultValue="+971 55 214 8892" className="pl-8" />
              </div>
            </div>
            <Button>Look up</Button>
            <Button variant="outline" className="text-destructive"><RotateCcw className="h-4 w-4" />Reset session</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Session snapshot</CardTitle></CardHeader>
          <CardContent className="divide-y">
            <Field label="Business" value="Atlas Electronics" />
            <Field label="Live flow" value="v14" />
            <Field label="Current step" value="Shop by Brand" />
            <Field label="Language" value="EN" />
            <Field label="Started" value="12 min ago" />
            <Field label="Session id" mono value="sess_5f9c1e-a212" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Runtime decision path</CardTitle>
              <StatusBadge tone="success">Healthy</StatusBadge>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {[
                { step: "Welcome Message", outcome: "Shown to customer" },
                { step: "Customer tapped: Shop products", outcome: "Matched option opt_shop" },
                { step: "Browse: Brands", outcome: "Listed 3 active brands" },
                { step: "Awaiting reply", outcome: "Session parked, 30s timeout" },
              ].map((r, i) => (
                <li key={i} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border p-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary text-xs font-medium">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.step}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.outcome}</div>
                  </div>
                  <StatusBadge tone="success">OK</StatusBadge>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Message trace</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { dir: "in", text: "Hi", meta: "Received 12:04" },
              { dir: "out", text: "Welcome to Atlas Electronics… (menu with 4 options)", meta: "Sent 12:04 · 200 OK" },
              { dir: "in", text: "Shop products", meta: "Received 12:05" },
              { dir: "out", text: "Which brand would you like?", meta: "Sent 12:05 · 200 OK" },
            ].map((m, i) => (
              <div key={i} className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-md border p-2.5 ${m.dir === "in" ? "bg-muted/30" : ""}`}>
                <StatusBadge tone={m.dir === "in" ? "neutral" : "info"}>{m.dir === "in" ? "In" : "Out"}</StatusBadge>
                <div className="min-w-0 truncate">{m.text}</div>
                <div className="text-xs text-muted-foreground">{m.meta}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cart / order</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cart is empty. Customer has not selected a product yet.
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Errors</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">No runtime or validation errors in this session.</CardContent>
        </Card>
      </div>
    </div>
  );
}
