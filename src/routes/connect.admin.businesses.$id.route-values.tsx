import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { browseGroups, routeValues } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { Plus, GripVertical, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/connect/admin/businesses/$id/route-values")({
  component: RouteValuesPage,
});

function RouteValuesPage() {
  const [groupId, setGroupId] = useState("grp_brand");
  const values = routeValues.filter((v) => v.groupId === groupId);
  const inactive = values.filter((v) => !v.active).length;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Route values</CardTitle>
              <CardDescription>Individual choices customers pick inside a browse group.</CardDescription>
            </div>
            <div className="flex items-end gap-2">
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {browseGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button><Plus className="h-4 w-4" />Add value</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {inactive > 0 && (
            <div className="mx-4 mb-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {inactive} inactive value{inactive === 1 ? "" : "s"} will not appear to customers.
            </div>
          )}
          <ul className="divide-y">
            {values.map((v) => (
              <li key={v.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{v.name}</span>
                    {!v.active && <StatusBadge tone="neutral">Inactive</StatusBadge>}
                    {v.productCount === 0 && <StatusBadge tone="warning">No products</StatusBadge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{v.productCount} products linked</div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked={v.active} />
                  <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
            {values.length === 0 && (
              <li className="p-10 text-center text-sm text-muted-foreground">
                No values yet in this group. Click "Add value" to create one.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
