import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { flowTemplates } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { CheckCircle2, Smartphone, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/connect/admin/businesses/$id/whatsapp")({
  component: WAConnectionPage,
});

function WAConnectionPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-success/10 text-success">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>WhatsApp Business connection</CardTitle>
              <CardDescription>Number, display name, and Meta status for this business.</CardDescription>
            </div>
            <StatusBadge tone="success" className="ml-auto"><CheckCircle2 className="h-3 w-3" />Connected</StatusBadge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Business display name</Label>
            <Input defaultValue="Atlas Electronics" />
          </div>
          <div className="space-y-1">
            <Label>WhatsApp number</Label>
            <Input defaultValue="+971 50 128 4402" />
          </div>
          <div className="space-y-1">
            <Label>Meta Business ID</Label>
            <Input defaultValue="1029384756" className="font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label>Phone number ID</Label>
            <Input defaultValue="109283746501928" className="font-mono text-sm" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Webhook URL</Label>
            <Input readOnly defaultValue="https://wa-admin.internal/api/webhooks/109283746501928" className="font-mono text-sm bg-muted/50" />
          </div>
          <div className="sm:col-span-2 flex justify-between items-center border-t pt-4">
            <div className="text-xs text-muted-foreground">Last handshake: 3 minutes ago</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4" />Re-verify</Button>
              <Button size="sm">Save changes</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template selected</CardTitle>
          <CardDescription>Which approved flow this business is built on.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {flowTemplates.map((t) => (
            <label key={t.id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/40 ${t.id === "tpl_ecom" ? "border-primary bg-primary/5" : ""}`}>
              <input type="radio" name="tpl" defaultChecked={t.id === "tpl_ecom"} className="mt-1" />
              <div className="min-w-0">
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.bestFor}</div>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
