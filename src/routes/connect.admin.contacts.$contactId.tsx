import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { TopBar } from "@/features/connect/flow-manager-ui/components/top-bar";
import { contacts } from "@/features/connect/flow-manager-ui/preview-data/mock-extra";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, formatCurrency } from "@/features/connect/flow-manager-ui/preview-data/format";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/connect/admin/contacts/$contactId")({
  component: ContactDetail,
});

function ContactDetail() {
  const { contactId } = Route.useParams();
  const c = contacts.find((x) => x.id === contactId);
  if (!c) throw notFound();

  return (
    <>
      <TopBar
        title={c.name}
        subtitle={`${c.phone} · ${c.business}`}
        breadcrumbs={
          <Link to="/connect/admin/contacts" className="inline-flex items-center gap-1 hover:underline">
            <ChevronLeft className="h-3 w-3" /> Contacts
          </Link>
        }
        actions={
          <>
            <Button variant="outline" size="sm">Start conversation</Button>
            <Button size="sm">Add to broadcast</Button>
          </>
        }
      />
      <div className="px-4 sm:px-6 pb-10 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-muted-foreground text-xs">Lifecycle</div><div><StatusBadge>{c.lifecycle}</StatusBadge></div></div>
              <div><div className="text-muted-foreground text-xs">Opt-in</div><div>{c.optIn ? "Yes" : "No"}</div></div>
              <div><div className="text-muted-foreground text-xs">Conversations</div><div>{c.conversationsCount}</div></div>
              <div><div className="text-muted-foreground text-xs">Lifetime spend</div><div>{formatCurrency(c.spend)}</div></div>
              <div><div className="text-muted-foreground text-xs">Last seen</div><div>{formatDistanceToNow(c.lastSeen)}</div></div>
              <div><div className="text-muted-foreground text-xs">Tags</div><div className="flex flex-wrap gap-1">{c.tags.map(t => <span key={t} className="rounded border px-1.5 py-0.5 text-[11px]">{t}</span>)}</div></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle>Custom attributes</CardTitle></CardHeader>
            <CardContent>
              {c.attributes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No custom attributes.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {c.attributes.map((a) => (
                    <div key={a.key}>
                      <div className="text-xs text-muted-foreground">{a.key}</div>
                      <div>{a.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm space-y-3">
                <li className="flex gap-3"><span className="w-24 text-xs text-muted-foreground shrink-0">{formatDistanceToNow(c.lastSeen)}</span><span>Sent message in Inbox</span></li>
                <li className="flex gap-3"><span className="w-24 text-xs text-muted-foreground shrink-0">2d ago</span><span>Received broadcast: seasonal_offer_v2</span></li>
                <li className="flex gap-3"><span className="w-24 text-xs text-muted-foreground shrink-0">1w ago</span><span>Placed order #10842</span></li>
                <li className="flex gap-3"><span className="w-24 text-xs text-muted-foreground shrink-0">1mo ago</span><span>Opted in via WhatsApp keyword JOIN</span></li>
              </ul>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle>Consent log</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between"><span>Marketing</span><StatusBadge tone={c.optIn ? "success" : "neutral"}>{c.optIn ? "Opted in" : "Not opted in"}</StatusBadge></div>
              <div className="flex justify-between"><span>Utility</span><StatusBadge tone="success">Opted in</StatusBadge></div>
              <div className="text-xs text-muted-foreground pt-2">Source: WhatsApp keyword JOIN · 32 days ago</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
