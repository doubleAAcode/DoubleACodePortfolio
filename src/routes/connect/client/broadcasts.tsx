import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/connect/client/broadcasts")({
  head: () => ({ meta: [{ title: "Broadcasts — Client Dashboard" }] }),
  component: ClientBroadcasts,
});

const rows = [
  { id: "b1", name: "Ramadan promo — 30% off accessories", status: "sent", audience: 4820, delivered: 4712, read: 3980, replied: 412, cost: 232.81, sentAt: "Nov 22" },
  { id: "b2", name: "Order status update Nov batch", status: "sent", audience: 1240, delivered: 1236, read: 1102, replied: 88, cost: 8.78, sentAt: "Nov 18" },
  { id: "b3", name: "Preorder launch — Galaxy S26", status: "scheduled", audience: 8420, delivered: 0, read: 0, replied: 0, cost: 0, sentAt: "Dec 2, 10:00" },
  { id: "b4", name: "Weekend flash sale draft", status: "draft", audience: 0, delivered: 0, read: 0, replied: 0, cost: 0, sentAt: "—" },
];

function ClientBroadcasts() {
  return (
    <>
      <ClientTopBar
        title="Broadcasts"
        subtitle="Send an approved template to a segment of your contacts."
        actions={<Button asChild><Link to="/connect/client/broadcasts"><Plus className="h-4 w-4" />New broadcast</Link></Button>}
      />
      <div className="min-w-0 px-4 pb-28 sm:px-6 sm:pb-10">
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Audience</th>
                  <th className="text-right p-3 font-medium">Delivered</th>
                  <th className="text-right p-3 font-medium">Read</th>
                  <th className="text-right p-3 font-medium">Replied</th>
                  <th className="text-right p-3 font-medium">Cost</th>
                  <th className="text-left p-3 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-accent/30">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        r.status === "sent" ? "bg-emerald-500/10 text-emerald-700" :
                        r.status === "scheduled" ? "bg-sky-500/10 text-sky-700" : "bg-muted"
                      }`}>{r.status}</span>
                    </td>
                    <td className="p-3 text-right tabular-nums">{r.audience.toLocaleString()}</td>
                    <td className="p-3 text-right tabular-nums">{r.delivered.toLocaleString()}</td>
                    <td className="p-3 text-right tabular-nums">{r.read.toLocaleString()}</td>
                    <td className="p-3 text-right tabular-nums">{r.replied.toLocaleString()}</td>
                    <td className="p-3 text-right tabular-nums">${r.cost.toFixed(2)}</td>
                    <td className="p-3 text-muted-foreground">{r.sentAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
