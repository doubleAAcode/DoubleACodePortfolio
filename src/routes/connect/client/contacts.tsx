import { createFileRoute } from "@tanstack/react-router";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contacts } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { EmptyState } from "@/features/connect/flow-manager-ui/components/empty-state";
import { Users, Search, Upload, Download } from "lucide-react";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";

export const Route = createFileRoute("/connect/client/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Client Dashboard" }] }),
  component: ClientContacts,
});

function ClientContacts() {
  return (
    <>
      <ClientTopBar
        title="Contacts"
        subtitle="Everyone who's ever messaged your business, across channels."
        actions={
          <>
            <Button variant="outline" onClick={() => toast.success("Export started")}><Download className="h-4 w-4" />Export</Button>
            <Button variant="outline" onClick={() => toast("CSV import dialog opened")}><Upload className="h-4 w-4" />Import CSV</Button>
            <Button>Add contact</Button>
          </>
        }
      />
      <div className="px-4 sm:px-6 pb-10 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, phone, tag…" className="pl-8" />
          </div>
        </div>

        {contacts.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title="No contacts yet" description="Import a CSV or connect a channel to start collecting contacts." />
        ) : (
          <div className="rounded-md border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Phone</th>
                  <th className="text-left p-3 font-medium">Lifecycle</th>
                  <th className="text-left p-3 font-medium">Tags</th>
                  <th className="text-left p-3 font-medium">Channels</th>
                  <th className="text-left p-3 font-medium">Consent</th>
                  <th className="text-left p-3 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contacts.map(c => (
                  <tr key={c.id} className="hover:bg-accent/30">
                    <td className="p-3">
                      <div className="font-medium">{c.name}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.phone}</td>
                    <td className="p-3">
                      <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-xs capitalize">{c.lifecycle}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {c.tags.slice(0, 3).map(t => (
                          <span key={t} className="rounded border px-1.5 py-0.5 text-[10px]">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">WhatsApp, Instagram</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium ${c.optIn ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {c.optIn ? "Opted in" : "—"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{formatDistanceToNow(c.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
