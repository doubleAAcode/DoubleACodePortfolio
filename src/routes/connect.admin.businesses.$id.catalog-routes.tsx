import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { browseGroups } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/connect/admin/businesses/$id/catalog-routes")({
  component: CatalogRoutesPage,
});

function CatalogRoutesPage() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Browse groups</CardTitle>
            <CardDescription>Ways customers can browse products — categories, brands, offers, etc. Internally called routes.</CardDescription>
          </div>
          <Button><Plus className="h-4 w-4" />Create browse group</Button>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {browseGroups.map((g) => (
              <li key={g.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">route: {g.technicalKey}</span>
                    {!g.active && <StatusBadge tone="neutral">Inactive</StatusBadge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{g.valueCount} values</div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked={g.active} aria-label="Active" />
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/connect/admin/businesses/$id/route-values" params={{ id }}>
                      <Pencil className="h-4 w-4" />
                      Values
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
