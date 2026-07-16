import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { CheckCircle2, RefreshCcw, Send } from "lucide-react";

export const Route = createFileRoute("/connect/admin/businesses/$id/live-test")({
  component: LiveTestPage,
});

function LiveTestPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Test setup</CardTitle>
          <CardDescription>Send test messages from a real device to the business number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Business WhatsApp number</Label>
            <Input readOnly defaultValue="+971 50 128 4402" className="bg-muted/50" />
          </div>
          <div className="space-y-1">
            <Label>Test customer number</Label>
            <Input defaultValue="+971 55 999 0102" />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button className="flex-1"><Send className="h-4 w-4" />Send sample message</Button>
            <Button variant="outline" className="flex-1"><RefreshCcw className="h-4 w-4" />Send /restart</Button>
          </div>
          <div className="pt-2 border-t space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Last publish version</span><span className="font-medium">v14</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Test status</span><StatusBadge tone="success"><CheckCircle2 className="h-3 w-3" />Passing</StatusBadge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last run</span><span>2 minutes ago</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Latest bot response</CardTitle>
          <CardDescription>Live capture of the last outbound message from the flow engine.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg p-4" style={{ background: "#e5ddd5" }}>
            <div className="ml-auto max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm" style={{ background: "#dcf8c6" }}>
              iPhone price list
            </div>
            <div className="mt-2 max-w-[80%] rounded-lg bg-white px-2 py-2 text-sm shadow-sm">
              <div className="grid h-32 place-items-center rounded bg-muted text-xs text-muted-foreground">[ Price list image ]</div>
              <div className="mt-2">Here's our current iPhone lineup 📱</div>
              <div className="mt-2 space-y-1 border-t pt-2">
                <div className="rounded border py-1 text-center text-xs text-primary">Back to menu</div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Delivered</div>
              <div className="font-medium">Yes · 340ms</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Meta status</div>
              <div className="font-medium">200 OK</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Session id</div>
              <div className="font-mono text-xs truncate">sess_5f9c1e</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
