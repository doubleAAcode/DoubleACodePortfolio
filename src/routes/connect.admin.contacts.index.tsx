import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { contacts, type Lifecycle } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { BulkActionBar } from "@/features/connect/flow-manager-ui/components/bulk-action-bar";
import { formatDistanceToNow, formatCurrency } from "@/features/connect/flow-manager-ui/preview-data/format";
import { Upload, Download, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";

export const Route = createFileRoute("/connect/admin/contacts/")({
  component: ContactsList,
});

const lifecycleTone: Record<Lifecycle, "success" | "info" | "warning" | "neutral"> = {
  vip: "success",
  customer: "info",
  lead: "warning",
  churned: "neutral",
};

function ContactsList() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const list = contacts.filter(
    (c) => !q || `${c.name} ${c.phone} ${c.business}`.toLowerCase().includes(q.toLowerCase())
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <TopBar
        title="Contacts"
        subtitle="Every WhatsApp contact across your businesses."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast("CSV import started")}><Upload className="h-4 w-4" />Import CSV</Button>
            <Button variant="outline" size="sm" onClick={() => toast("Export queued")}><Download className="h-4 w-4" />Export</Button>
            <Button size="sm"><Plus className="h-4 w-4" />New contact</Button>
          </>
        }
      />
      <div className="px-4 sm:px-6 pb-10 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" className="pl-8 h-9" />
          </div>
          <div className="text-xs text-muted-foreground">{list.length} contacts</div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.length === list.length && list.length > 0}
                    onCheckedChange={(v) => setSelected(v ? list.map((c) => c.id) : [])}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Opt-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                  </TableCell>
                  <TableCell>
                    <Link to="/connect/admin/contacts/$contactId" params={{ contactId: c.id }} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{c.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{c.business}</TableCell>
                  <TableCell>
                    <StatusBadge tone={lifecycleTone[c.lifecycle]}>{c.lifecycle}</StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(c.spend)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDistanceToNow(c.lastSeen)}</TableCell>
                  <TableCell>
                    {c.optIn ? (
                      <StatusBadge tone="success">Yes</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">No</StatusBadge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <BulkActionBar
          count={selected.length}
          onClear={() => setSelected([])}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => toast.success(`Tagged ${selected.length} contacts`)}>Tag</Button>
              <Button size="sm" variant="ghost" onClick={() => toast.success(`Exported ${selected.length} contacts`)}>Export</Button>
              <Button size="sm" variant="ghost" onClick={() => toast.success(`Added ${selected.length} to broadcast`)}>Add to broadcast</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => toast(`Delete blocked in demo`)}>Delete</Button>
            </>
          }
        />
      </div>
    </>
  );
}
