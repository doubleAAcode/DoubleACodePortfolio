import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClientTopBar } from "@/features/connect/flow-manager-ui/components/client-top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { paymentRequests } from "@/features/connect/flow-manager-ui/preview-data/mock-enterprise";
import { ChannelBadge } from "@/features/connect/flow-manager-ui/components/channel-badge";
import { formatDistanceToNow } from "@/features/connect/flow-manager-ui/preview-data/format";
import { CreditCard, Send, DollarSign, TrendingUp, CheckCircle2, Clock, XCircle, Undo2 } from "lucide-react";
import { toast } from "@/features/connect/flow-manager-ui/preview-toast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect/client/payments")({
  head: () => ({ meta: [{ title: "Payments — Client Dashboard" }] }),
  component: ClientPayments,
});

const statusIcon = {
  paid: CheckCircle2,
  pending: Clock,
  expired: XCircle,
  refunded: Undo2,
} as const;
const statusColor = {
  paid: "text-emerald-600 bg-emerald-500/10",
  pending: "text-amber-600 bg-amber-500/10",
  expired: "text-muted-foreground bg-muted",
  refunded: "text-sky-600 bg-sky-500/10",
} as const;

function ClientPayments() {
  const [amount, setAmount] = useState("299");
  const [memo, setMemo] = useState("Atlas Boom Bluetooth Speaker");
  const [contact, setContact] = useState("+971 50 991 0022");

  const totalPaid = paymentRequests.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendingCount = paymentRequests.filter(p => p.status === "pending").length;

  return (
    <>
      <ClientTopBar
        title="Payments in chat"
        subtitle="Send payment requests inside WhatsApp, Instagram, and Messenger."
        actions={
          <Button variant="outline"><CreditCard className="h-4 w-4" />Payment providers</Button>
        }
      />
      <div className="px-4 sm:px-6 pb-10 space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Collected (30d)</div><div className="mt-1 text-2xl font-semibold tabular-nums">AED {totalPaid.toLocaleString()}</div><div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1"><TrendingUp className="h-3 w-3" />+18% vs prev</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending requests</div><div className="mt-1 text-2xl font-semibold tabular-nums">{pendingCount}</div><div className="text-[11px] text-muted-foreground mt-1">Awaiting payment</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Conversion rate</div><div className="mt-1 text-2xl font-semibold">62%</div><div className="text-[11px] text-muted-foreground mt-1">Requests → paid</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Avg time to pay</div><div className="mt-1 text-2xl font-semibold">4m 12s</div><div className="text-[11px] text-muted-foreground mt-1">Apple Pay dominant</div></CardContent></Card>
        </div>

        <Tabs className="min-w-0" defaultValue="requests">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="requests">All requests</TabsTrigger>
            <TabsTrigger value="compose">Send request</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Contact</th>
                    <th className="text-left p-3">Amount</th>
                    <th className="text-left p-3">Channel</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Memo</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paymentRequests.map(p => {
                    const Icon = statusIcon[p.status];
                    return (
                      <tr key={p.id} className="hover:bg-accent/30">
                        <td className="p-3 font-medium">{p.contact}</td>
                        <td className="p-3 tabular-nums font-semibold">{p.currency} {p.amount.toLocaleString()}</td>
                        <td className="p-3"><ChannelBadge channel={p.channel} size="xs" /></td>
                        <td className="p-3">
                          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", statusColor[p.status])}>
                            <Icon className="h-3 w-3" />{p.status}
                          </span>
                          {p.method && <span className="ml-1.5 text-[10px] text-muted-foreground">· {p.method}</span>}
                        </td>
                        <td className="p-3 text-muted-foreground max-w-sm truncate">{p.memo}</td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDistanceToNow(p.createdAt)}</td>
                        <td className="p-3 text-right">
                          {p.status === "pending" && <Button size="sm" variant="outline" onClick={() => toast.success("Reminder sent")}>Remind</Button>}
                          {p.status === "paid" && <Button size="sm" variant="ghost" onClick={() => toast.success("Refund initiated")}>Refund</Button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="compose" className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>New payment request</CardTitle>
                <CardDescription>Sent as a native payment message on WhatsApp Pay or as a Stripe link.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><label className="text-xs text-muted-foreground">Contact</label><Input value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1" /></div>
                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <div>
                    <label className="text-xs text-muted-foreground">Amount</label>
                    <div className="mt-1 flex items-center rounded-md border">
                      <div className="grid h-9 w-9 place-items-center border-r text-sm text-muted-foreground"><DollarSign className="h-4 w-4" /></div>
                      <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="border-0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Currency</label>
                    <Input defaultValue="AED" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Memo shown to customer</label>
                  <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} className="mt-1" rows={3} />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">Apple Pay</Badge>
                  <Badge variant="outline">Card</Badge>
                  <Badge variant="outline">Tabby (BNPL)</Badge>
                  <Badge variant="outline">STC Pay</Badge>
                </div>
                <Button className="w-full" onClick={() => toast.success("Payment request sent on WhatsApp")}>
                  <Send className="h-4 w-4" />Send request
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border p-3">
                  <div className="text-xs text-muted-foreground mb-2">To: {contact} · WhatsApp Pay</div>
                  <div className="rounded-md bg-background border p-3 shadow-sm">
                    <div className="text-xs text-muted-foreground">Atlas Electronics requests</div>
                    <div className="text-2xl font-semibold tabular-nums mt-1">AED {Number(amount || 0).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground mt-1">{memo}</div>
                    <Button className="w-full mt-3" size="sm">Pay now</Button>
                    <div className="mt-2 text-[10px] text-muted-foreground text-center">Secured by Stripe · expires in 24h</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Stripe", desc: "Cards + Apple Pay + Google Pay", on: true, color: "bg-indigo-500" },
              { name: "WhatsApp Pay India", desc: "UPI native payments (IN)", on: false, color: "bg-emerald-500" },
              { name: "Tabby", desc: "Buy-now-pay-later (GCC)", on: true, color: "bg-lime-500" },
              { name: "STC Pay", desc: "Wallet payments (SA)", on: true, color: "bg-purple-500" },
              { name: "Tap Payments", desc: "MENA-first gateway", on: false, color: "bg-sky-500" },
              { name: "PayPal", desc: "Global fallback", on: false, color: "bg-blue-600" },
            ].map(p => (
              <Card key={p.name}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("grid h-10 w-10 place-items-center rounded-md text-white text-xs font-bold", p.color)}>
                    {p.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.desc}</div>
                  </div>
                  <Button size="sm" variant={p.on ? "outline" : "default"}>{p.on ? "Manage" : "Connect"}</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
