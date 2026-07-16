import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { products } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { formatCurrency } from "@/features/connect/flow-manager-ui/preview-data/format";
import { Plus, Search, Filter, Package, Smartphone, Headphones, Watch, Ear } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/connect/admin/businesses/$id/products")({
  component: ProductsPage,
});

const iconFor = (kind: string) => {
  const cls = "h-5 w-5";
  if (kind === "phone") return <Smartphone className={cls} />;
  if (kind === "headphones") return <Headphones className={cls} />;
  if (kind === "watch") return <Watch className={cls} />;
  if (kind === "earbud") return <Ear className={cls} />;
  return <Package className={cls} />;
};

function ProductsPage() {
  const [q, setQ] = useState("");
  const filtered = products.filter((p) => p.nameEn.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>All products this business sells on WhatsApp.</CardDescription>
            </div>
            <Button><Plus className="h-4 w-4" />New product</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name or code…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
            </div>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4" />Browse group</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Placement</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-md bg-muted text-muted-foreground">
                          {iconFor(p.image)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.nameEn}</div>
                          <div className="text-xs text-muted-foreground truncate" dir="rtl">{p.nameAr}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.placements.map((pl) => (
                          <span key={pl} className="rounded bg-accent text-accent-foreground px-1.5 py-0.5 text-xs">{pl}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {p.stock === 0 ? <span className="text-destructive">0</span> : p.stock < 5 ? <span className="text-warning-foreground">{p.stock}</span> : p.stock}
                    </td>
                    <td className="px-4 py-3">
                      {!p.active ? (
                        <StatusBadge tone="neutral">Inactive</StatusBadge>
                      ) : !p.available ? (
                        <StatusBadge tone="warning">Unavailable</StatusBadge>
                      ) : (
                        <StatusBadge tone="success">Available</StatusBadge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost">Edit</Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">No products match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
