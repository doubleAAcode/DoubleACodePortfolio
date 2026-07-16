import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/connect/admin/settings/")({
  component: WorkspaceSettings,
});

function WorkspaceSettings() {
  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader><CardTitle>Workspace</CardTitle><CardDescription>Basic details about this admin tenant.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label>Workspace name</Label><Input defaultValue="Ops — MENA region" /></div>
          <div className="space-y-1"><Label>Default region</Label><Input defaultValue="me-central-1" /></div>
          <div className="space-y-1"><Label>Default currency</Label><Input defaultValue="AED" /></div>
          <div className="space-y-1"><Label>Support email</Label><Input defaultValue="support@internal.example" /></div>
          <div className="space-y-1">
            <Label>Default language</Label>
            <Select defaultValue="en">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Timezone</Label>
            <Select defaultValue="dubai">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dubai">Asia/Dubai (GST)</SelectItem>
                <SelectItem value="riyadh">Asia/Riyadh (AST)</SelectItem>
                <SelectItem value="doha">Asia/Qatar (AST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Email me when a business publishes", def: true },
            { label: "Email me on Meta template rejection", def: true },
            { label: "Daily digest of failed sends", def: false },
            { label: "Alert on SLA breaches", def: true },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between text-sm">
              <span>{n.label}</span>
              <Switch defaultChecked={n.def} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
