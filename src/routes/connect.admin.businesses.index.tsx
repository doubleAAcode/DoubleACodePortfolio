import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { BusinessStatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { businesses } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { PlusCircle, Search, Filter } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/connect/admin/businesses/")({
  head: () => ({ meta: [{ title: "Businesses — WA Admin" }] }),
  component: BusinessesList,
});

function BusinessesList() {
  const [q, setQ] = useState("");
  const filtered = businesses.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <TopBar
        title="Businesses"
        subtitle="All businesses managed by your team."
        actions={
          <Button>
            <PlusCircle className="h-4 w-4" />
            New business
          </Button>
        }
      />
      <div className="px-4 sm:px-6 pb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">WhatsApp #</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link to="/connect/admin/businesses/$id" params={{ id: b.id }} className="font-medium hover:underline">
                        {b.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{b.owner}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{b.category}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{b.waNumber}</td>
                    <td className="px-4 py-3">
                      <BusinessStatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${b.progress}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{b.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDistanceToNow(b.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/connect/admin/businesses/$id" params={{ id: b.id }}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-sm text-muted-foreground">
                      No businesses match "{q}". Try a different search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
